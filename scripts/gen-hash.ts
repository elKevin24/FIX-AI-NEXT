import bcryptjs from 'bcryptjs';

async function generateHash() {
    const password = 'password123';
    const hash = await bcryptjs.hash(password, 12);
    console.log('Password hash for "password123":');
    console.log(hash);
}

generateHash();
