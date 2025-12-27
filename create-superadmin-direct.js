// Direct script to create superadmin user
// Süperadmin kullanıcı oluşturmak için doğrudan script
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const path = require('path');
const fs = require('fs');

// Load .env file manually
// .env dosyasını manuel olarak yükle
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function createSuperadmin() {
  const prisma = new PrismaClient();
  
  try {
    const email = 'admin@aitrainer.com';
    const name = 'Admin User';
    const password = 'Admin123!';
    
    // Check if user already exists
    // Kullanıcı zaten var mı kontrol et
    const existing = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existing) {
      if (existing.isSuperadmin) {
        console.log('✅ Superadmin already exists:', existing.email);
        console.log('   ID:', existing.id);
        console.log('   isSuperadmin:', existing.isSuperadmin);
        return;
      } else {
        // Upgrade to superadmin
        // Süperadmin'e yükselt
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: { isSuperadmin: true }
        });
        console.log('✅ User upgraded to superadmin:', updated.email);
        console.log('   ID:', updated.id);
        console.log('   isSuperadmin:', updated.isSuperadmin);
        return;
      }
    }
    
    // Hash password
    // Şifreyi hash'le
    const passwordHash = await argon2.hash(password);
    
    // Create superadmin user
    // Süperadmin kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        isSuperadmin: true
      }
    });
    
    console.log('✅ Superadmin created successfully!');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   isSuperadmin:', user.isSuperadmin);
  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperadmin();

