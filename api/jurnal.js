import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  // Mengambil data (GET)
  if (req.method === 'GET') {
    try {
      const data = await sql`SELECT * FROM jurnal_kelas ORDER BY id DESC`;
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Menyimpan data (POST)
  if (req.method === 'POST') {
    try {
      const { tanggal, nis, nama, status, catatan } = req.body;
      const result = await sql`
        INSERT INTO jurnal_kelas (tanggal, nis, nama, status, catatan) 
        VALUES (${tanggal}, ${nis}, ${nama}, ${status}, ${catatan})
        RETURNING *;
      `;
      return res.status(201).json(result[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
