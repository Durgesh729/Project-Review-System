import React, { useState } from "react";

export default function YearSelectionPopup({ years, onSelect, onAddYear, isCoordinator, onLogout }) {
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

                    {/* "+" Button - Coordinator Only */}
                    {isCoordinator && (
                        <div
                            onClick={onAddYear}
                            className="border border-gray-300 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-blue-600 text-2xl transition-colors"
                            title="Add Next Academic Year"
                        >
                            +
                        </div>
                    )}
                </div>

                <button
                    disabled={!selectedYear}
                    onClick={() => onSelect(selectedYear)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Continue
                </button>

                {/* Logout Option for trapped users */}
                <div className="mt-4 text-center">
                    <button
                        onClick={onLogout}
                        className="text-sm text-gray-500 hover:text-red-600 underline"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
