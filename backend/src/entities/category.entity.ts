import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ExpenseReason } from './expense-reason.entity';
import { User } from './user.entity';

export enum CategoryType {
  WANTS = 'wants',
  NEEDS = 'needs',
  INVESTMENTS = 'investments',
}

@Entity('categories')
@Unique(['name', 'userId'])
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  type: CategoryType;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.categories, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @OneToMany(() => ExpenseReason, (reason) => reason.category)
  expenseReasons: ExpenseReason[];
}