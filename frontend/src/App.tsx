import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; // 기본 스타일링을 위해 App.css는 유지합니다.

// countries 테이블의 데이터 타입을 정의합니다.
type Country = {
    id: number;
    name: string;
    created_at: string;
};

function App() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 데이터를 가져오는 비동기 함수를 정의합니다.
        const fetchCountries = async () => {
            try {
                setLoading(true);
                // supabase 클라이언트를 사용하여 'countries' 테이블에서 모든 데이터를 선택합니다.
                const { data, error } = await supabase
                    .from('countries')
                    .select('*');

                if (error) {
                    // Supabase에서 에러를 반환한 경우
                    throw error;
                }

                if (data) {
                    // 성공적으로 데이터를 가져온 경우, 상태를 업데이트합니다.
                    setCountries(data);
                }
            } catch (err) {
                // 네트워크 에러 등 다른 에러가 발생한 경우
                if (err instanceof Error) {
                    console.error('Error fetching countries:', err.message);
                    setError(err.message);
                }
            } finally {
                // 성공하든 실패하든 로딩 상태를 종료합니다.
                setLoading(false);
            }
        };

        fetchCountries(); // 컴포넌트가 마운트될 때 함수를 실행합니다.
    }, []); // 빈 배열을 전달하여 이펙트가 한 번만 실행되도록 합니다.

    return (
        <div className="App">
            <header className="App-header">
                <h1>Vercel + React + Supabase</h1>
                <h2>Countries from Supabase DB</h2>

                {loading && <p>Loading countries...</p>}

                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                {!loading && !error && (
                    <ul>
                        {countries.length > 0 ? (
                            countries.map((country) => (
                                <li key={country.id}>{country.name}</li>
                            ))
                        ) : (
                            <p>No countries found. Please add some data to your 'countries' table in Supabase.</p>
                        )}
                    </ul>
                )}
            </header>
        </div>
    );
}

export default App;