import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { openDB } from 'idb';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useOfflineStatus from '../hooks/useOfflineStatus';

const OfflineSyncContext = createContext();

const DB_NAME = 'pms-offline-db';
const STORE_NAME = 'uploads';

export const OfflineSyncProvider = ({ children }) => {
    const isOnline = useOfflineStatus();
    const [offlineQueue, setOfflineQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initialize DB
    useEffect(() => {
        const initDB = async () => {
            try {
                const db = await openDB(DB_NAME, 1, {
                    upgrade(db) {
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        }
                    },
                });

                // Load initial queue
                const allItems = await db.getAll(STORE_NAME);
                setOfflineQueue(allItems);
            } catch (err) {
                console.error('Failed to init IndexedDB:', err);
            }
        };

        initDB();
    }, []);

    // Sync when coming online
    useEffect(() => {
        if (isOnline && offlineQueue.length > 0 && !isSyncing) {
            syncOfflineFiles();
        }
    }, [isOnline, offlineQueue.length, isSyncing]);

    const addToQueue = async (file, metadata) => {
        try {
            const id = crypto.randomUUID();
            const item = {
                id,
                file, // storing the Blob directly
                metadata,
                timestamp: Date.now(),
                status: 'pending'
            };

            const db = await openDB(DB_NAME, 1);
            await db.put(STORE_NAME, item);

            setOfflineQueue(prev => [...prev, item]);
            toast.success('Offline mode: File saved and will sync when online');
            return item;
        } catch (err) {
            console.error('Error adding to offline queue:', err);
            toast.error('Failed to save file offline');
            throw err;
        }
    };

    const removeFromQueue = async (id) => {
        try {
            const db = await openDB(DB_NAME, 1);
            await db.delete(STORE_NAME, id);
            setOfflineQueue(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Error removing from queue:', err);
        }
    };

    const syncOfflineFiles = async () => {
        if (isSyncing || offlineQueue.length === 0) return;

        setIsSyncing(true);
        const toastId = toast.loading('Syncing offline files...');

        let syncedCount = 0;
        let errorCount = 0;

        // Use a copy of the queue to iterate
        const queueToSync = [...offlineQueue];

        for (const item of queueToSync) {
            try {
                await processUpload(item);
                await removeFromQueue(item.id);
                syncedCount++;
            } catch (err) {
                console.error(`Failed to sync item ${item.id}:`, err);
                errorCount++;
                // Keep in queue? Or mark as failed? For now, keep in queue but maybe we should add retry count
            }
        }

        setIsSyncing(false);

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} file(s) successfully`, { id: toastId });
        } else if (errorCount > 0) {
            toast.error(`Failed to sync ${errorCount} file(s)`, { id: toastId });
        } else {
            toast.dismiss(toastId);
        }
    };

    // The actual upload logic (extracted/adapted from MenteeDashboard)
    const processUpload = async (item) => {
        const { file, metadata } = item;
        const { stageKey, projectId, userId, stageLabel } = metadata;

        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop();
        const storagePath = metadata.storagePath || `${userId}/${projectId}/${stageKey}/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('submissions') // Use constant if possible, but hardcoded for now based on MenteeDashboard
            .upload(storagePath, file, {
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('submissions')
            .getPublicUrl(storagePath);

        // 3. Save to Database (Submissions Table)
        // Check existing
        const { data: existingSubmission, error: selectError } = await supabase
            .from('submissions')
            .select('id')
            .eq('project_id', projectId)
            .eq('mentee_id', userId)
            .eq('stage_key', stageKey)
            .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;

        const submissionPayload = {
            project_id: projectId,
            mentee_id: userId,
            stage_key: stageKey,
            filename: file.name,
            file_url: publicUrl,
            storage_path: storagePath,
            status: 'pending',
            uploaded_at: new Date().toISOString()
        };

        if (existingSubmission) {
            const { error } = await supabase
                .from('submissions')
                .update(submissionPayload)
                .eq('id', existingSubmission.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('submissions')
                .insert(submissionPayload);
            if (error) throw error;
        }

        // 4. Save to Project Files
        // Fetch mentor ID if needed... this is tricky without the full project object.
        // For now, we might skip mentor_id or try to pass it in metadata.
        // Let's assume metadata has it or we skip it for offline sync resilience.

        const { error: projectFilesError } = await supabase
            .from('project_files')
            .insert({
                project_id: projectId,
                uploaded_by: userId,
                file_name: file.name,
                file_url: publicUrl,
                file_type: stageLabel,
                mentor_id: metadata.mentorId || null,
            });

        if (projectFilesError) console.error('project_files insert error:', projectFilesError);

        return publicUrl;
    };

    const value = {
        isOnline,
        offlineQueue,
        isSyncing,
        addToQueue,
        removeFromQueue,
        syncOfflineFiles
    };

    return (
        <OfflineSyncContext.Provider value={value}>
            {children}
        </OfflineSyncContext.Provider>
    );
};

export const useOfflineSync = () => {
    const context = useContext(OfflineSyncContext);
    if (!context) {
        throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
    }
    return context;
};
