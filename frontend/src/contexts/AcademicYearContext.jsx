import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import YearSelectionPopup from '../components/YearSelectionPopup';
import { useLocation } from 'react-router-dom';

const AcademicYearContext = createContext();

export const useAcademicYear = () => useContext(AcademicYearContext);

export const AcademicYearProvider = ({ children }) => {
    const { user, userProfile, activeRole, signOut } = useAuth();
    const location = useLocation();

    const [availableYears, setAvailableYears] = useState([]);
    // State is now strictly in-memory and per-role
    const [selectedYearsByRole, setSelectedYearsByRole] = useState({});
    const [loading, setLoading] = useState(true);

    const isCoordinator = userProfile?.roles?.includes('project_coordinator') || userProfile?.role === 'project_coordinator';

    // Derived selected year based on active role
    const selectedYear = activeRole ? selectedYearsByRole[activeRole] || null : null;

    // Strict Global Rule: These paths MUST have a year selected
    const isProtectedDashboard = location.pathname.includes('/dashboard/') ||
        location.pathname.includes('-dashboard') ||
        location.pathname === '/components/dashboard/coordinator' ||
        location.pathname === '/components/dashboard/mentor' ||
        location.pathname === '/components/dashboard/mentee' ||
        location.pathname === '/components/dashboard/hod';

    useEffect(() => {
        if (user) {
            fetchYears();
        } else {
            // STRICT RESET ON LOGOUT
            setAvailableYears([]);
            setSelectedYearsByRole({});
        }
    }, [user]);

    const fetchYears = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('academic_years')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setAvailableYears(data || []);
        } catch (error) {
            console.error('Error fetching academic years:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNextYear = async () => {
        if (!isCoordinator) return;

        try {
            // 1. Find max year
            let lastYearEnd = 2025; // Default base
            let lastYearName = "2024-2025";

            if (availableYears.length > 0) {
                // Sort by name to get latest
                const sorted = [...availableYears].sort((a, b) => a.name.localeCompare(b.name));
                lastYearName = sorted[sorted.length - 1].name;
                // Parse "CY-NY" e.g "2024-2025" -> 2025
                const parts = lastYearName.split('-');
                if (parts.length === 2) {
                    lastYearEnd = parseInt(parts[1]);
                }
            }

            const nextStartYear = lastYearEnd;
            const nextEndYear = lastYearEnd + 1;
            const nextYearName = `${nextStartYear}-${nextEndYear}`;
            const nextStartDate = `${nextStartYear}-07-01`;
            const nextEndDate = `${nextEndYear}-06-30`;

            // 2. Insert into DB
            const { data, error } = await supabase
                .from('academic_years')
                .insert({
                    name: nextYearName,
                    start_date: nextStartDate,
                    end_date: nextEndDate
                })
                .select()
                .single();

            if (error) throw error;

            // 3. Update local state
            setAvailableYears(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error('Error creating next academic year:', error);
            alert('Failed to create next academic year. Please ensure the database table exists.');
        }
    };

    const handleSelectYear = (year) => {
        if (!activeRole) {
            console.warn("Cannot select year without an active role");
            return;
        }
        // Save per role, strictly in memory
        setSelectedYearsByRole(prev => ({
            ...prev,
            [activeRole]: year
        }));
    };

    const isProjectInYear = (project, year = selectedYear) => {
        if (!year) return true; // Fallback

        // Project Start: created_at or assigned_at or start_date
        const projectStartRaw = project.created_at || project.assigned_at || new Date().toISOString();
        const projectStartDate = new Date(projectStartRaw);

        // Project Duration: duration_months or default 12
        let duration = 12; // default
        if (project.duration_months) duration = project.duration_months;
        else if (project.coordinatorAssignment?.duration_months) duration = project.coordinatorAssignment.duration_months;
        else if (project.duration === '1 Semester') duration = 6;
        else if (project.duration === '3 Semesters') duration = 18;
        else if (project.duration === '4 Semesters') duration = 24;

        // Project End
        const projectEndDate = new Date(projectStartDate);
        projectEndDate.setMonth(projectEndDate.getMonth() + duration);

        // Year Range
        const yearStart = new Date(year.start_date);
        const yearEnd = new Date(year.end_date);

        // Check Overlap
        return (projectStartDate <= yearEnd) && (projectEndDate >= yearStart);
    };

    const contextValue = {
        selectedYear,
        availableYears,
        addNextYear,
        isProjectInYear,
        loading
    };

    // STRICT BLOCKING LOGIC
    // If on a protected dashboard AND no year selected (and done loading initial check), BLOCK access.
    // We wait for 'loading' to finish so we don't flash the popup if localStorage has the year.
    if (!loading && isProtectedDashboard && !selectedYear) {
        return (
            <AcademicYearContext.Provider value={contextValue}>
                <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center">
                    {/* We wrap YearSelectionPopup to ensure it looks right even if strictly isolated */}
                    <YearSelectionPopup
                        years={availableYears}
                        onSelect={handleSelectYear}
                        onAddYear={addNextYear}
                        isCoordinator={isCoordinator}
                        onLogout={signOut}
                    />
                </div>
            </AcademicYearContext.Provider>
        );
    }

    return (
        <AcademicYearContext.Provider value={contextValue}>
            {children}
        </AcademicYearContext.Provider>
    );
};
