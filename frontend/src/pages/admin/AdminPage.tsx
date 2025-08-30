import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthProvider'; // useAuth 훅 임포트

type Profile = {
    id: string;
    email: string | null;
    nickname: string | null;
    is_approved: boolean;
    role: 'admin' | 'member';
};

const AdminPage = () => {
    const { user } = useAuth(); // 현재 로그인된 사용자 정보 가져오기
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, nickname, is_approved, role')
                    .neq('role', 'admin') // admin 역할은 목록에서 제외
                    .order('created_at', { ascending: true });

                if (error) {
                    throw error;
                }

                setMembers(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, []);

    const handleApprovalToggle = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: newStatus })
                .eq('id', id);

            if (error) {
                throw error;
            }

            setMembers(prevMembers =>
                prevMembers.map(member =>
                    member.id === id ? { ...member, is_approved: newStatus } : member
                )
            );
        } catch (err: any) {
            alert(`Error updating status: ${err.message}`);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">회원 정보를 불러오는 중...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">오류: {error}</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">로그인이 필요합니다.</div>;
    }

    return (
        <div className="flex justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
                <div className="sm:flex sm:items-center mb-6">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-bold leading-6 text-slate-900 dark:text-slate-100">
                            회원 관리
                        </h1>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            가입한 일반 회원 목록입니다. 계정 승인 상태를 관리할 수 있습니다.
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-700">
                        <thead>
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 sm:pl-0">닉네임</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">이메일</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">승인 여부</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="py-4 text-center text-sm text-slate-500">
                                    등록된 일반 회원이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 dark:text-slate-100 sm:pl-0">{member.nickname || 'N/A'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{member.email}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400 flex justify-center">
                                        <button
                                            onClick={() => handleApprovalToggle(member.id, member.is_approved)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:ring-offset-slate-900 ${
                                                member.is_approved ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'
                                            }`}
                                            role="switch"
                                            aria-checked={member.is_approved}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    member.is_approved ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;