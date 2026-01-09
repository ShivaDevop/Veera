import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/decorators/roles.decorator';

export class UserRolesResponseDto {
  @ApiProperty({
    example: ['Student', 'Teacher'],
    description: 'List of roles assigned to the user',
  })
  roles: Role[];

  @ApiProperty({
    example: 'Teacher',
    required: false,
    description: 'Currently active role (if set)',
  })
  activeRole?: Role;
}

