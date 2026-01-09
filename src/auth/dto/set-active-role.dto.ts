import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/decorators/roles.decorator';

export class SetActiveRoleDto {
  @ApiProperty({
    example: 'Teacher',
    enum: ['Student', 'Teacher', 'Parent', 'SchoolAdmin', 'PlatformAdmin'],
    description: 'The role to set as active for the current session',
  })
  @IsEnum(['Student', 'Teacher', 'Parent', 'SchoolAdmin', 'PlatformAdmin'])
  @IsNotEmpty()
  role: Role;
}

