// TASK-02 - Halaman awal aplikasi LabSync: mengarahkan rute dasar ke modul praktikan (/student)
// sementara peran aktif (Asisten / Praktikan) dikontrol secara instan melalui Header App Shell.

import { Redirect } from 'expo-router';

const Index = () => <Redirect href="/student" />;

export default Index;
