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
    const isHod = userProfile?.roles?.includes('hod') || userProfile?.role === 'hod';
    const canAddYear = isCoordinator || isHod;

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
        if (!canAddYear) return null;

        try {
            // 1. Find max year
            let lastYearEnd = new Date().getFullYear(); // Default base if no years exist

            // Try to find the latest year from existing list
            if (availableYears.length > 0) {
                // Sort by name to get latest
                // Assumption: name format is always "YYYY-YYYY"
                const sorted = [...availableYears].sort((a, b) => {
                    const startA = parseInt(a.name.split('-')[0]) || 0;
                    const startB = parseInt(b.name.split('-')[0]) || 0;
                    return startA - startB;
                });

                const lastYearName = sorted[sorted.length - 1].name;
                const parts = lastYearName.split('-');
                if (parts.length === 2) {
                    lastYearEnd = parseInt(parts[1], 10);
                }
            } else {
                // If completely empty, assume we are starting from current year's start
                // e.g. if now is 2026, we likely want "2025-2026" as the first option
                lastYearEnd = new Date().getFullYear() - 1;
            }

            // Calculate next year
            // Logic: "YYYY-YYYY" -> increment both by 1
            // e.g. 2025-2026 -> 2026-2027
            const nextStartYear = lastYearEnd;
            const nextEndYear = lastYearEnd + 1;
            const nextYearName = `${nextStartYear}-${nextEndYear}`;

            // Duplicate Check
            const exists = availableYears.some(y => y.name === nextYearName);
            if (exists) {
                // Return explicit error object or throw
                throw new Error(`Year ${nextYearName} already exists`);
            }

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
            const newYear = data;
            setAvailableYears(prev => [...prev, newYear].sort((a, b) => a.name.localeCompare(b.name)));

            return newYear;
        } catch (error) {
            console.error('Error creating next academic year:', error);
            throw error; // Propagate to UI
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

        // 1. Authoritative: Use server-computed visible_sessions if available
        if (project.visible_sessions && Array.isArray(project.visible_sessions)) {
            return project.visible_sessions.includes(year.name);
        }

        // 2. Legacy Fallback: Client-side calculation
        // Project Start: prioritize assigned_at, then created_at
        const projectStartRaw = project.assigned_at || project.created_at || new Date().toISOString();
        const projectStartDate = new Date(projectStartRaw);

        // Project Duration: duration_months or default 12
        let duration = 12; // default
        if (project.duration_months) duration = project.duration_months;
        else if (project.coordinatorAssignment?.duration_months) duration = project.coordinatorAssignment.duration_months;
        else if (project.duration === '1 Semester') duration = 6;
        else if (project.duration === '3 Semesters') duration = 18;
        else if (project.duration === '4 Semesters') duration = 24;

        // Project End
        let projectEndDate; // This will hold the actual end date (deadline or calculated)
        if (project.deadline) {
            projectEndDate = new Date(project.deadline);
        } else {
            let calculatedEndDate = new Date(projectStartDate);
            calculatedEndDate.setMonth(calculatedEndDate.getMonth() + duration);
            projectEndDate = calculatedEndDate;
        }

        // Year Range
        const yearStart = new Date(year.start_date);
        const yearEnd = new Date(year.end_date);

        // Standard Check: Overlap
        const isOverlap = (projectStartDate <= yearEnd) && (projectEndDate >= yearStart);
        return isOverlap;

        return false;
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
    // All roles including mentees must select a year.
    if (!loading && isProtectedDashboard && !selectedYear) {
        return (
            <AcademicYearContext.Provider value={contextValue}>
                <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center">
                    {/* We wrap YearSelectionPopup to ensure it looks right even if strictly isolated */}
                    <YearSelectionPopup
                        years={availableYears}
                        onSelect={handleSelectYear}
                        onAddYear={addNextYear}
                        yearToSelect={selectedYear}
                        isCoordinator={canAddYear}
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
