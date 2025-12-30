import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FirebaseConfigScreenProps {
    setFirebaseConfig: (config: string) => void;
}

const FirebaseConfigScreen: React.FC<FirebaseConfigScreenProps> = ({ setFirebaseConfig }) => {
    const [configInput, setConfigInput] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSave = () => {
        try {
            // JSON formatını doğrula
            const parsedConfig = JSON.parse(configInput);

            // Gerekli alanların basit kontrolü
            if (!parsedConfig.apiKey || !parsedConfig.authDomain || !parsedConfig.projectId) {
                throw new Error('Eksik konfigürasyon alanları. Lütfen geçerli bir Firebase yapılandırma nesnesi girin.');
            }

            // Konfigürasyonu kaydet
            setFirebaseConfig(JSON.stringify(parsedConfig));

            // Başarılı, ana sayfaya yönlendir
            navigate('/home');
        } catch (err) {
            setError('Geçersiz JSON formatı. Lütfen kontrol edip tekrar deneyin.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-primary">settings_b_roll</span>
                </div>

                <h1 className="text-2xl font-bold text-center text-text-main dark:text-white mb-2">
                    Firebase Yapılandırması
                </h1>

                <p className="text-center text-gray-600 dark:text-gray-300 mb-6 font-medium">
                    Uygulamayı kullanabilmek için Firebase proje ayarlarınızı JSON formatında aşağıya yapıştırın.
                </p>

                <div className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={configInput}
                            onChange={(e) => {
                                setConfigInput(e.target.value);
                                setError('');
                            }}
                            placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                            className="w-full h-48 p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-mono text-sm text-text-main dark:text-gray-200"
                        />
                        {error && (
                            <p className="absolute -bottom-6 left-0 text-red-500 text-sm font-bold flex items-center">
                                <span className="material-symbols-outlined text-sm mr-1">error</span>
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!configInput.trim()}
                        className="w-full h-12 mt-4 bg-primary hover:bg-primary-dark disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
                    >
                        <span className="mr-2">Kaydet ve Devam Et</span>
                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-text-main dark:hover:text-white transition-colors"
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirebaseConfigScreen;
