import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login DTO with validation
 * Giriş DTO'su doğrulama ile
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email address / Kullanıcı e-posta adresi',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address / Lütfen geçerli bir e-posta adresi girin' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(255, { message: 'Email must not exceed 255 characters / E-posta 255 karakteri geçmemelidir' })
  email!: string;

  @ApiProperty({
    description: 'User password / Kullanıcı şifresi',
    example: 'SecurePassword123!',
    minLength: 1,
  })
  @IsString({ message: 'Password must be a string / Şifre bir string olmalıdır' })
  @MinLength(1, { message: 'Password is required / Şifre gereklidir' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters / Şifre 128 karakteri geçmemelidir' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  password!: string;
}
