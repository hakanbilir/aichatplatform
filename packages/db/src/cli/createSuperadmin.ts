#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * CLI tool to create a superadmin user.
 * Süperadmin kullanıcı oluşturmak için CLI aracı.
 * 
 * Usage: ts-node src/cli/createSuperadmin.ts
 * Or: npm run create-superadmin
 */

import * as readline from 'readline';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

// Default salt rounds for password hashing
// Şifre hash'leme için varsayılan tuz turu
const DEFAULT_SALT_ROUNDS = 10;

/**
 * Prompt user for input.
 * Kullanıcıdan girdi al.
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for password with hidden input (masked).
 * Gizli girdi ile şifre al (maskelenmiş).
 */
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    
    // Store original settings
    // Orijinal ayarları sakla
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw || false;
    
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    
    const cleanup = () => {
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    const onData = (char: string | Buffer) => {
      // Handle Buffer input (common in raw mode)
      // Buffer girdisini işle (raw modda yaygın)
      const charStr = typeof char === 'string' ? char : char.toString('utf8');
      
      // Handle multi-byte characters
      // Çok baytlı karakterleri işle
      if (charStr.length === 0) return;
      
      const firstChar = charStr[0];
      
      switch (firstChar) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          cleanup();
          console.log(''); // New line after password input
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          cleanup();
          console.log('\n\nOperation cancelled. / İşlem iptal edildi.');
          process.exit(0);
          break;
        case '\u007f': // Backspace
        case '\b': // Alternative backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          // Only add printable characters
          // Sadece yazdırılabilir karakterleri ekle
          if (firstChar >= ' ' && firstChar <= '~') {
            password += firstChar;
            process.stdout.write('*');
          }
          break;
      }
    };

    stdin.on('data', onData);
    
    // Handle errors
    // Hataları işle
    stdin.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

/**
 * Validate email format.
 * E-posta formatını doğrula.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength.
 * Şifre gücünü doğrula.
 */
function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

/**
 * Hash password using bcrypt.
 * Bcrypt kullanarak şifreyi hash'le.
 */
async function hashPassword(plain: string): Promise<string> {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || DEFAULT_SALT_ROUNDS;
  return bcrypt.hash(plain, saltRounds);
}

/**
 * Main function to create superadmin user.
 * Süperadmin kullanıcı oluşturmak için ana fonksiyon.
 */
async function main() {
  console.log('=== Create Superadmin User ===');
  console.log('=== Süperadmin Kullanıcı Oluştur ===\n');

  try {
    // Get email
    // E-posta al
    let email = '';
    while (!email || !isValidEmail(email)) {
      email = await prompt('Email: ');
      if (!email) {
        console.log('Email is required. / E-posta gereklidir.');
        continue;
      }
      if (!isValidEmail(email)) {
        console.log('Invalid email format. / Geçersiz e-posta formatı.');
        email = '';
      }
    }

    // Check if user already exists
    // Kullanıcı zaten var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`\nUser with email ${email} already exists.`);
      console.log(`E-posta ${email} ile kullanıcı zaten mevcut.`);
      
      if (existingUser.isSuperadmin) {
        console.log('This user is already a superadmin.');
        console.log('Bu kullanıcı zaten bir süperadmin.');
      } else {
        const upgrade = await prompt('\nDo you want to upgrade this user to superadmin? (y/n): ');
        if (upgrade.toLowerCase() === 'y' || upgrade.toLowerCase() === 'yes') {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { isSuperadmin: true },
          });
          console.log('\n✓ User upgraded to superadmin successfully!');
          console.log('✓ Kullanıcı süperadmin olarak yükseltildi!');
          await prisma.$disconnect();
          process.exit(0);
        } else {
          console.log('Operation cancelled. / İşlem iptal edildi.');
          await prisma.$disconnect();
          process.exit(0);
        }
      }
      await prisma.$disconnect();
      process.exit(0);
    }

    // Get name
    // İsim al
    let name = '';
    while (!name) {
      name = await prompt('Name (optional): ');
      if (!name) {
        name = 'Superadmin User';
      }
    }

    // Get password
    // Şifre al
    let password = '';
    let passwordValid = false;
    while (!passwordValid) {
      password = await promptPassword('Password (min 8 characters): ');
      const validation = isValidPassword(password);
      if (!validation.valid) {
        console.log(`\n${validation.message}`);
        continue;
      }

      // Confirm password
      // Şifreyi onayla
      const confirmPassword = await promptPassword('Confirm password: ');
      if (password !== confirmPassword) {
        console.log('\nPasswords do not match. Please try again.');
        console.log('Şifreler eşleşmiyor. Lütfen tekrar deneyin.');
        password = '';
        continue;
      }
      passwordValid = true;
    }

    // Hash password and create user
    // Şifreyi hash'le ve kullanıcı oluştur
    console.log('\nCreating superadmin user...');
    console.log('Süperadmin kullanıcı oluşturuluyor...');

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        isSuperadmin: true,
      },
    });

    console.log('\n✓ Superadmin user created successfully!');
    console.log('✓ Süperadmin kullanıcı başarıyla oluşturuldu!');
    console.log(`\nUser ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Superadmin: ${user.isSuperadmin}`);

    // Ask if user should be added to an organization
    // Kullanıcının bir organizasyona eklenip eklenmeyeceğini sor
    const addToOrg = await prompt('\nAdd user to an organization? (y/n): ');
    if (addToOrg.toLowerCase() === 'y' || addToOrg.toLowerCase() === 'yes') {
      const orgSlug = await prompt('Organization slug (or press Enter to skip): ');
      if (orgSlug) {
        const org = await prisma.organization.findUnique({
          where: { slug: orgSlug },
        });

        if (org) {
          // Check if user is already a member
          // Kullanıcının zaten üye olup olmadığını kontrol et
          const existingMember = await prisma.orgMember.findUnique({
            where: {
              userId_orgId: {
                userId: user.id,
                orgId: org.id,
              },
            },
          });

          if (!existingMember) {
            const role = await prompt('Role (OWNER/ADMIN/MEMBER/VIEWER) [OWNER]: ');
            const selectedRole = role || 'OWNER';

            await prisma.orgMember.create({
              data: {
                userId: user.id,
                orgId: org.id,
                role: selectedRole as any,
              },
            });

            console.log(`\n✓ User added to organization "${org.name}" as ${selectedRole}`);
            console.log(`✓ Kullanıcı "${org.name}" organizasyonuna ${selectedRole} olarak eklendi`);
          } else {
            console.log(`\nUser is already a member of organization "${org.name}"`);
            console.log(`Kullanıcı zaten "${org.name}" organizasyonunun üyesi`);
          }
        } else {
          console.log(`\nOrganization with slug "${orgSlug}" not found.`);
          console.log(`"${orgSlug}" slug'ına sahip organizasyon bulunamadı.`);
        }
      }
    }

    console.log('\n✓ Done!');
    console.log('✓ Tamamlandı!');
  } catch (error) {
    console.error('\n✗ Error creating superadmin user:');
    console.error('✗ Süperadmin kullanıcı oluşturulurken hata:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
// Doğrudan çalıştırılırsa çalıştır
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

