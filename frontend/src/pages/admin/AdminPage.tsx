import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient'; // 상대 경로로 수정하여 안정성 확보

type Profile = {
    id: string;
    email: string | null;
    is_approved: boolean;
};

const AdminPage = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, is_approved')
                    .neq('role', 'admin');

                if (error) throw error;

                setProfiles(data || []);
            } catch (error) {
                console.error("Error fetching profiles:", (error as Error).message);
                alert("회원 목록을 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, []);

    const handleApprovalToggle = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setProfiles(prevProfiles =>
                prevProfiles.map(p =>
                    p.id === id ? { ...p, is_approved: !currentStatus } : p
                )
            );
        } catch (error) {
            console.error("Error updating status:", (error as Error).message);
            alert("상태 변경에 실패했습니다.");
        }
    };

    if (loading) {
        return <div>Loading members...</div>;
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Member Management</h1>
            <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approval Status
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {profiles.map((profile) => (
                        <tr key={profile.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {profile.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                    onClick={() => handleApprovalToggle(profile.id, profile.is_approved)}
                                    className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                                        profile.is_approved ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                    }`}
                                >
                                    {profile.is_approved ? 'Revoke' : 'Approve'}
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPage;