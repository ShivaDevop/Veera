import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({
    example: 'Please add more documentation to your code.',
    description: 'Review comment',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

