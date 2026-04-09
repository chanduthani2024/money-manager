import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('gmail_sync_records')
export class GmailSyncRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  messageIds: string;

  @Column({ type: 'jsonb', nullable: true })
  emails: any;

  @CreateDateColumn()
  createdAt: Date;
}
