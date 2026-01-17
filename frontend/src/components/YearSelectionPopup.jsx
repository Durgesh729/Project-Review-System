import React, { useState } from "react";

export default function YearSelectionPopup({ years, onSelect, onAddYear, isCoordinator }) {
    const [selectedYear, setSelectedYear] = useState("");

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
                <h2 className="text-xl font-semibold mb-4 text-center">
                    Select Academic Year
                </h2>

                <div className="grid gap-3 mb-4 max-h-[60vh] overflow-y-auto">
                    {years.map((year) => (
                        <div
                            key={year.id}
                            onClick={() => setSelectedYear(year)}
                            className={`border rounded-lg p-4 text-center cursor-pointer transition-colors ${selectedYear?.id === year.id
                                ? "bg-blue-600 text-white border-blue-600"
                                : "hover:bg-gray-100 border-gray-200"
                                }`}
                        >
                            {year.name}
                        </div>
                    ))}

                    {/* "+" Button - Coordinator/HOD Only */}
                    {isCoordinator && (
                        <button
                            onClick={async () => {
                                try {
                                    const newYear = await onAddYear();
                                    if (newYear) {
                                        onSelect(newYear);
                                    }
                                } catch (error) {
                                    // Error handled in context or here if needed
                                    // alert(error.message); // Simple fallback if toast logic isn't passed
                                    // Ideally we use a toast here if available. 
                                    // Since context throws, we should catch it.
                                    console.error(error);
                                    const msg = error.message || 'Failed to add year';
                                    // We can use a simple browser alert if toast isn't available in this scope, 
                                    // or checking if react-hot-toast (which user has in other files) can be used here.
                                    // Given MenteeDashboard uses it, let's try to grab it if we modify imports,
                                    // but for now, let's use a safe alert to satisfy the requirement if toast isn't imported.
                                    // UPDATE: I will assume I can import toast.
                                    // Re-checking imports: User file didn't have toast imported.
                                    // I'll add the import in a separate tool call or just use alert for now to be safe, 
                                    // then add toast import if I can.
                                    // Actually, I can replace the whole file content or use multi_replace to add import.
                                    // Let's use alert for immediate feedback as duplicate check throws error.
                                    alert(msg);
                                }
                            }}
                            className="w-full border border-gray-300 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-blue-600 text-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Add Next Academic Year"
                            aria-label="Add next academic year"
                        >
                            +
                        </button>
                    )}
                </div>

                <button
                    disabled={!selectedYear}
                    onClick={() => onSelect(selectedYear)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Continue
                </button>

            </div>
        </div>
    );
}
