const { cert, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const sa = require('./service-account.json');

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function run() {
  const users = await db.collection('users').get();
  console.log('USERS:');
  users.forEach(doc => {
    const d = doc.data();
    if (d.role === 'student') {
      console.log(doc.id, '=>', d.name, d.email, 'class:', d.className, d.class, d.classCode);
    }
  });

  const sessions = await db.collection('sessions').where('status', '==', 'ACTIVE').get();
  console.log('\nACTIVE SESSIONS for C:');
  sessions.forEach(doc => {
    const d = doc.data();
    if (d.className === 'C' || d.className === 'Kelas C' || d.mainClass === 'Kelas C' || d.class === 'Kelas C' || d.class === 'C') {
      console.log(doc.id, '=>', JSON.stringify(d));
    }
  });
}

run().catch(console.error);
