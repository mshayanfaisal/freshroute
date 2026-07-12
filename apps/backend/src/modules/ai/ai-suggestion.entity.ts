import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiFeature } from '../../common/enums';

/**
 * Audit log of every AI suggestion, capturing input context, output, whether a
 * fallback was used, and (for pricing/forecast) whether the user accepted it.
 * Powers the "forecast accuracy" and "pricing acceptance" analytics.
 */
@Entity('ai_suggestions')
export class AiSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'enum', enum: AiFeature })
  feature: AiFeature;

  /** User the suggestion was generated for (farmer/buyer/driver). */
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /** Optional link to the domain entity (produce id, complaint id, run id...). */
  @Column({ name: 'subject_id', type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'jsonb', name: 'input_context' })
  inputContext: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'output' })
  output: Record<string, unknown>;

  /** True when the LLM was unavailable and a deterministic fallback was served. */
  @Column({ name: 'used_fallback', default: false })
  usedFallback: boolean;

  @Column({ name: 'model', type: 'varchar', nullable: true })
  model: string | null;

  // ---- Accuracy tracking (filled in later) ----
  @Column({ name: 'accepted', type: 'boolean', nullable: true, default: null })
  accepted: boolean | null;

  /** For forecasts: the actual observed value, recorded after the fact. */
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'actual_value', nullable: true })
  actualValue: number | null;

  /** For forecasts: the predicted value, for accuracy comparison. */
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'predicted_value', nullable: true })
  predictedValue: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
