import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Hanya izinkan metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Hubungkan ke Neon PostgreSQL menggunakan Environment Variable Vercel
        const sql = neon(process.env.DATABASE_URL);
        const { className, attendance, quran } = req.body;

        // 1. Sinkronisasi Data Presensi
        if (attendance) {
            for (const [dateKey, studentsObj] of Object.entries(attendance)) {
                for (const [nis, data] of Object.entries(studentsObj)) {
                    const existing = await sql`
                        SELECT id FROM attendance_logs 
                        WHERE nis = ${nis} AND date = ${dateKey} AND class_id = ${className}
                    `;

                    if (existing.length > 0) {
                        await sql`
                            UPDATE attendance_logs 
                            SET status = ${data.status}, note = ${data.note || ''}
                            WHERE nis = ${nis} AND date = ${dateKey} AND class_id = ${className}
                        `;
                    } else {
                        await sql`
                            INSERT INTO attendance_logs (class_id, nis, date, status, note)
                            VALUES (${className}, ${nis}, ${dateKey}, ${data.status}, ${data.note || ''})
                        `;
                    }
                }
            }
        }

        // 2. Sinkronisasi Data Penilaian Al-Qur'an
        if (quran && Array.isArray(quran)) {
            for (const q of quran) {
                await sql`
                    INSERT INTO quran_assessments 
                    (id, class_id, nis, category, date, surah, score, grade, smoothness, tajweed, teacher, note)
                    VALUES (
                        ${q.id}, ${q.classId}, ${q.studentNis}, ${q.category}, ${q.date}, 
                        ${q.surah}, ${q.score}, ${q.grade}, ${q.smoothness}, ${q.tajweed}, 
                        ${q.teacher || ''}, ${q.note || ''}
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        score = EXCLUDED.score,
                        grade = EXCLUDED.grade,
                        smoothness = EXCLUDED.smoothness,
                        tajweed = EXCLUDED.tajweed,
                        teacher = EXCLUDED.teacher,
                        note = EXCLUDED.note
                `;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Data berhasil disinkronkan ke Neon PostgreSQL!' 
        });

    } catch (error) {
        console.error('Database Sync Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
