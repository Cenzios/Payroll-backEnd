import React, { useEffect, useState } from 'react';

// Mock API Call
const getSubscriptionStatus = async () => {
    // In real app: fetch('/api/v1/subscription/access-status')
    // For now, this logic is typically returned in the User object or a dedicated endpoint
    return { status: 'BLOCKED', message: 'Please pay your monthly subscription to continue' };
};

const ProtectedComponent = () => {
    const [accessStatus, setAccessStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
    const [blockMessage, setBlockMessage] = useState('');

    useEffect(() => {
        // Check status on mount
        getSubscriptionStatus().then(res => {
            setAccessStatus(res.status as 'ACTIVE' | 'BLOCKED');
            setBlockMessage(res.message);
        });
    }, []);

    const isBlocked = accessStatus === 'BLOCKED';

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Employee Management</h1>

            {/* 🚫 Blocking Banner */}
            {isBlocked && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                    <p className="font-bold">Access Restricted</p>
                    <p>{blockMessage}</p>
                    <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded">
                        Pay Now
                    </button>
                </div>
            )}

            {/* 🔒 Form with Disabled State */}
            <form className={`space-y-4 ${isBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        disabled={isBlocked}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        disabled={isBlocked}
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isBlocked}
                        className={`px-4 py-2 rounded-md text-white ${isBlocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        Create Employee
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProtectedComponent;
