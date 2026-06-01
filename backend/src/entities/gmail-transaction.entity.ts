import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GmailSyncRecord } from './gmail-sync.entity';

@Entity('gmail_transactions')
export class GmailTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  gmailSyncId: number;

  @ManyToOne(() => GmailSyncRecord)
  @JoinColumn({ name: 'gmailSyncId' })
  gmailSync: GmailSyncRecord;

  @Column({ unique: true })
  messageId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  fromAddress: string;

  @Column({ nullable: true, type: 'text' })
  snippet: string;

  @Column({ nullable: true })
  rawDate: string;

  @Column({ type: 'timestamp', nullable: true })
  transactionDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'unknown' })
  transactionType: 'debited' | 'credited' | 'unknown';

  @Column({ nullable: true })
  expenseReasonId: number;

  @Column({ default: false })
  isClassifiedReason: boolean;

  @Column({ default: false })
  isRejected: boolean;

  @Column({ type: 'varchar', length: 16, default: 'debit' })
  cardType: 'debit' | 'credit';

  @Column({ nullable: true })
  transactionId: number | null;

  @Column({ nullable: true, type: 'varchar', length: 30 })
  refNo: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
