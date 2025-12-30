import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FirebaseConfigScreenProps {
    setFirebaseConfig?: (config: string) => void;
    onAddConfig?: (name: string, config: string) => void;
}

const FirebaseConfigScreen: React.FC<FirebaseConfigScreenProps> = ({ setFirebaseConfig, onAddConfig }) => {
    const [configInput, setConfigInput] = useState('');
    const [bookName, setBookName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleConfigChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setConfigInput(val);
        setError('');

        // Auto-detect project ID to use as name if name is empty
        try {
            if (val.trim().startsWith('{') && !bookName) {
                const parsed = JSON.parse(val);
                if (parsed.projectId) {
                    setBookName(parsed.projectId);
                }
            }
        } catch (e) { /* ignore parse errors while typing */ }
    };

    const handleSave = () => {
        try {
            let finalConfig = '';
            let detectedName = bookName.trim();

            // Config alanı doluysa doğrula
            if (configInput.trim()) {
                const parsedConfig = JSON.parse(configInput);
                if (typeof parsedConfig !== 'object' || parsedConfig === null) {
                    throw new Error('Yapılandırma geçerli bir JSON objesi olmalıdır.');
                }
                finalConfig = JSON.stringify(parsedConfig);

                // Eğer isim hala yoksa ve config'den projectId çıkıyorsa onu al
                if (!detectedName && parsedConfig.projectId) {
                    detectedName = parsedConfig.projectId;
                }
            }

            // İsim belirleme (Hala boş ise varsayılan)
            const finalName = detectedName || `İsimsiz Defter (${new Date().toLocaleDateString()})`;

            // Kayıt işlemi
            if (onAddConfig) {
                onAddConfig(finalName, finalConfig);
            } else if (setFirebaseConfig) {
                setFirebaseConfig(finalConfig);
            }

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
                    Yeni Defter Ekle
                </h1>

                <p className="text-center text-gray-600 dark:text-gray-300 mb-6 font-medium text-sm">
                    Yeni bir tarif defteri oluşturun. Firebase konfigürasyonunu yapıştırdığınızda defter adı otomatik olarak doldurulacaktır.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Defter Adı</label>
                        <input
                            type="text"
                            value={bookName}
                            onChange={(e) => setBookName(e.target.value)}
                            placeholder="Örn: Yazlık Ev (Boş bırakılabilir)"
                            className="w-full h-12 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-text-main dark:text-white"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Firebase Konfigürasyonu (İsteğe Bağlı)
                        </label>
                        <textarea
                            value={configInput}
                            onChange={handleConfigChange}
                            placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                            className="w-full h-40 p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-mono text-xs text-text-main dark:text-gray-200"
                        />
                        {error && (
                            <p className="absolute -bottom-6 left-0 text-red-500 text-sm font-bold flex items-center animate-pulse">
                                <span className="material-symbols-outlined text-sm mr-1">error</span>
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full h-12 mt-6 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center active:scale-[0.98]"
                    >
                        <span className="mr-2">Defteri Oluştur</span>
                        <span className="material-symbols-outlined text-xl">check</span>
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-text-main dark:hover:text-white transition-colors text-sm"
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirebaseConfigScreen;
