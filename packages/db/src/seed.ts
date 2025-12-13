/* eslint-disable no-console */

import { prisma } from './index';
import bcrypt from 'bcryptjs';

// Default salt rounds for password hashing
// Şifre hash'leme için varsayılan tuz turu
const DEFAULT_SALT_ROUNDS = 10;

async function main() {
  // Check if default org exists
  // Varsayılan org'un var olup olmadığını kontrol et
  const existing = await prisma.organization.findFirst({
    where: { slug: 'default-org' },
  });

  if (existing) {
    console.log('Default organization already exists, skipping seed.');
    console.log('Varsayılan organizasyon zaten mevcut, seed atlanıyor.');
    return;
  }

  // Create default organization
  // Varsayılan organizasyon oluştur
  const org = await prisma.organization.create({
    data: {
      name: 'Default Org',
      slug: 'default-org',
      plan: 'FREE',
      monthlySoftLimitTokens: 100000,
      monthlyHardLimitTokens: 120000,
    },
  });

  console.log('Created default organization:', org.id);
  console.log('Varsayılan organizasyon oluşturuldu:', org.id);

  // Get superadmin credentials from environment variables or use defaults
  // Ortam değişkenlerinden süperadmin kimlik bilgilerini al veya varsayılanları kullan
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@example.com';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'admin123';
  const superadminName = process.env.SUPERADMIN_NAME || 'Admin User';

  // Check if superadmin user already exists
  // Süperadmin kullanıcının zaten var olup olmadığını kontrol et
  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail },
  });

  if (existingSuperadmin) {
    console.log(`Superadmin user with email ${superadminEmail} already exists.`);
    console.log(`${superadminEmail} e-postasına sahip süperadmin kullanıcı zaten mevcut.`);
    
    // Ensure existing user is marked as superadmin
    // Mevcut kullanıcının süperadmin olarak işaretlendiğinden emin ol
    if (!existingSuperadmin.isSuperadmin) {
      await prisma.user.update({
        where: { id: existingSuperadmin.id },
        data: { isSuperadmin: true },
      });
      console.log('Updated existing user to superadmin.');
      console.log('Mevcut kullanıcı süperadmin olarak güncellendi.');
    }
  } else {
    // Create default admin user
    // Varsayılan admin kullanıcı oluştur
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || DEFAULT_SALT_ROUNDS;
    const passwordHash = await bcrypt.hash(superadminPassword, saltRounds);

    const adminUser = await prisma.user.create({
      data: {
        email: superadminEmail,
        name: superadminName,
        passwordHash,
        isSuperadmin: true,
      },
    });

    console.log('Created admin user:', adminUser.id);
    console.log('Admin kullanıcı oluşturuldu:', adminUser.id);

    // Add admin user to default org as OWNER
    // Admin kullanıcıyı varsayılan org'a OWNER olarak ekle
    await prisma.orgMember.create({
      data: {
        userId: adminUser.id,
        orgId: org.id,
        role: 'OWNER',
      },
    });

    console.log('Added admin user to default organization as OWNER');
    console.log('Admin kullanıcı varsayılan organizasyona OWNER olarak eklendi');

    // Display credentials (with security warning)
    // Kimlik bilgilerini göster (güvenlik uyarısı ile)
    console.log('\n=== Superadmin Credentials ===');
    console.log('=== Süperadmin Kimlik Bilgileri ===');
    console.log(`Email: ${superadminEmail}`);
    console.log(`Password: ${superadminPassword}`);
    console.log('\n⚠️  WARNING: Change the default password in production!');
    console.log('⚠️  UYARI: Üretim ortamında varsayılan şifreyi değiştirin!');
    console.log('\nTo customize credentials, set these environment variables:');
    console.log('Kimlik bilgilerini özelleştirmek için şu ortam değişkenlerini ayarlayın:');
    console.log('  SUPERADMIN_EMAIL=your-email@example.com');
    console.log('  SUPERADMIN_PASSWORD=your-secure-password');
    console.log('  SUPERADMIN_NAME="Your Name"');
  }
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

