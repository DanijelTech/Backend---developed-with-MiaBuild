/**
 * @file Notification Service za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-NOTIF-001 Notification service za zaledne sisteme
 * @design DSN-ZALEDNI-NOTIF-001 Backend notification service arhitektura
 * @test TEST-ZALEDNI-NOTIF-001 Preverjanje notification service
 *
 * Notification Service - prilagojen za zaledne sisteme:
 * - Multi-channel delivery
 * - Template management
 * - Scheduling
 * - Batching
 * - Retry logic
 * - Preference management
 * - Analytics
 * - Rate limiting
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom NOTIF_001 - Notification Service
 */
/**
 * Notification channel
 */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'in_app' | 'slack' | 'teams';
/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
/**
 * Notification
 */
export interface Notification {
    readonly notificationId: string;
    readonly channel: NotificationChannel;
    readonly recipient: NotificationRecipient;
    readonly subject: string;
    readonly body: string;
    readonly priority: NotificationPriority;
    readonly status: NotificationStatus;
    readonly templateId: string | null;
    readonly templateData: Readonly<Record<string, unknown>>;
    readonly scheduledAt: number | null;
    readonly sentAt: number | null;
    readonly deliveredAt: number | null;
    readonly failedAt: number | null;
    readonly retryCount: number;
    readonly error: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * Notification recipient
 */
export interface NotificationRecipient {
    readonly recipientId: string;
    readonly type: RecipientType;
    readonly address: string;
    readonly name: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Recipient type
 */
export type RecipientType = 'user' | 'group' | 'topic' | 'external';
/**
 * Notification template
 */
export interface NotificationTemplate {
    readonly templateId: string;
    readonly name: string;
    readonly channel: NotificationChannel;
    readonly subject: string;
    readonly body: string;
    readonly variables: readonly TemplateVariable[];
    readonly version: number;
    readonly active: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * Template variable
 */
export interface TemplateVariable {
    readonly name: string;
    readonly type: VariableType;
    readonly required: boolean;
    readonly defaultValue: unknown;
    readonly description: string;
}
/**
 * Variable type
 */
export type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
/**
 * User preferences
 */
export interface UserPreferences {
    readonly userId: string;
    readonly channels: Readonly<Record<NotificationChannel, ChannelPreference>>;
    readonly quietHours: QuietHours | null;
    readonly frequency: FrequencyPreference;
    readonly categories: Readonly<Record<string, CategoryPreference>>;
    readonly updatedAt: number;
}
/**
 * Channel preference
 */
export interface ChannelPreference {
    readonly enabled: boolean;
    readonly address: string | null;
    readonly verified: boolean;
}
/**
 * Quiet hours
 */
export interface QuietHours {
    readonly enabled: boolean;
    readonly startHour: number;
    readonly endHour: number;
    readonly timezone: string;
    readonly allowUrgent: boolean;
}
/**
 * Frequency preference
 */
export interface FrequencyPreference {
    readonly maxPerHour: number;
    readonly maxPerDay: number;
    readonly digestEnabled: boolean;
    readonly digestTime: number | null;
}
/**
 * Category preference
 */
export interface CategoryPreference {
    readonly enabled: boolean;
    readonly channels: readonly NotificationChannel[];
}
/**
 * Notification batch
 */
export interface NotificationBatch {
    readonly batchId: string;
    readonly notifications: readonly string[];
    readonly status: BatchStatus;
    readonly totalCount: number;
    readonly sentCount: number;
    readonly failedCount: number;
    readonly startedAt: number | null;
    readonly completedAt: number | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Batch status
 */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
/**
 * Channel provider
 */
export interface ChannelProvider {
    readonly providerId: string;
    readonly channel: NotificationChannel;
    readonly name: string;
    readonly send: ProviderSendFunction;
    readonly checkStatus: ProviderStatusFunction | null;
    readonly config: Readonly<Record<string, unknown>>;
    readonly active: boolean;
}
/**
 * Provider send function
 */
export type ProviderSendFunction = (notification: Notification) => Promise<ProviderResult>;
/**
 * Provider status function
 */
export type ProviderStatusFunction = (notificationId: string) => Promise<NotificationStatus>;
/**
 * Provider result
 */
export interface ProviderResult {
    readonly success: boolean;
    readonly messageId: string | null;
    readonly error: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Notification event
 */
export interface NotificationEvent {
    readonly eventId: string;
    readonly type: NotificationEventType;
    readonly notificationId: string;
    readonly channel: NotificationChannel;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Notification event type
 */
export type NotificationEventType = 'notification_created' | 'notification_queued' | 'notification_sending' | 'notification_sent' | 'notification_delivered' | 'notification_failed' | 'notification_cancelled' | 'notification_retried' | 'batch_started' | 'batch_completed' | 'batch_failed' | 'template_created' | 'template_updated' | 'preferences_updated';
/**
 * Notification event listener
 */
export type NotificationEventListener = (event: NotificationEvent) => void | Promise<void>;
/**
 * Notification statistics
 */
export interface NotificationStatistics {
    readonly totalSent: number;
    readonly totalDelivered: number;
    readonly totalFailed: number;
    readonly totalPending: number;
    readonly byChannel: Readonly<Record<NotificationChannel, ChannelStatistics>>;
    readonly avgDeliveryTime: number;
    readonly deliveryRate: number;
}
/**
 * Channel statistics
 */
export interface ChannelStatistics {
    readonly sent: number;
    readonly delivered: number;
    readonly failed: number;
    readonly avgDeliveryTime: number;
}
/**
 * Retry policy
 */
export interface RetryPolicy {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffMultiplier: number;
}
/**
 * Rate limit config
 */
export interface RateLimitConfig {
    readonly maxPerSecond: number;
    readonly maxPerMinute: number;
    readonly maxPerHour: number;
    readonly burstSize: number;
}
/**
 * Create template
 */
export declare function createTemplate(name: string, channel: NotificationChannel, subject: string, body: string, options?: {
    variables?: readonly TemplateVariable[];
    metadata?: Record<string, unknown>;
}): NotificationTemplate;
/**
 * Get template
 */
export declare function getTemplate(nameOrId: string): NotificationTemplate | null;
/**
 * Get all templates
 */
export declare function getAllTemplates(): readonly NotificationTemplate[];
/**
 * Update template
 */
export declare function updateTemplate(nameOrId: string, updates: {
    subject?: string;
    body?: string;
    variables?: readonly TemplateVariable[];
    active?: boolean;
    metadata?: Record<string, unknown>;
}): NotificationTemplate | null;
/**
 * Delete template
 */
export declare function deleteTemplate(nameOrId: string): boolean;
/**
 * Register provider
 */
export declare function registerProvider(channel: NotificationChannel, name: string, send: ProviderSendFunction, options?: {
    checkStatus?: ProviderStatusFunction;
    config?: Record<string, unknown>;
}): ChannelProvider;
/**
 * Get provider
 */
export declare function getProvider(channel: NotificationChannel): ChannelProvider | null;
/**
 * Get all providers
 */
export declare function getAllProviders(): readonly ChannelProvider[];
/**
 * Remove provider
 */
export declare function removeProvider(channel: NotificationChannel): boolean;
/**
 * Get user preferences
 */
export declare function getUserPreferences(userId: string): UserPreferences | null;
/**
 * Set user preferences
 */
export declare function setUserPreferences(userId: string, prefs: Partial<Omit<UserPreferences, 'userId' | 'updatedAt'>>): UserPreferences;
/**
 * Delete user preferences
 */
export declare function deleteUserPreferences(userId: string): boolean;
/**
 * Send notification
 */
export declare function send(channel: NotificationChannel, recipient: NotificationRecipient, subject: string, body: string, options?: {
    priority?: NotificationPriority;
    templateId?: string;
    templateData?: Record<string, unknown>;
    scheduledAt?: number;
    metadata?: Record<string, unknown>;
}): Promise<Notification>;
/**
 * Send using template
 */
export declare function sendWithTemplate(templateNameOrId: string, recipient: NotificationRecipient, data: Record<string, unknown>, options?: {
    priority?: NotificationPriority;
    scheduledAt?: number;
    metadata?: Record<string, unknown>;
}): Promise<Notification>;
/**
 * Send to multiple recipients
 */
export declare function sendBulk(channel: NotificationChannel, recipients: readonly NotificationRecipient[], subject: string, body: string, options?: {
    priority?: NotificationPriority;
    templateId?: string;
    templateData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<NotificationBatch>;
/**
 * Mark as delivered
 */
export declare function markDelivered(notificationId: string): Promise<Notification | null>;
/**
 * Cancel notification
 */
export declare function cancel(notificationId: string): Promise<Notification | null>;
/**
 * Get notification
 */
export declare function getNotification(notificationId: string): Notification | null;
/**
 * Get all notifications
 */
export declare function getAllNotifications(): readonly Notification[];
/**
 * Get notifications by recipient
 */
export declare function getNotificationsByRecipient(recipientId: string): readonly Notification[];
/**
 * Get notifications by status
 */
export declare function getNotificationsByStatus(status: NotificationStatus): readonly Notification[];
/**
 * Get notifications by channel
 */
export declare function getNotificationsByChannel(channel: NotificationChannel): readonly Notification[];
/**
 * Get batch
 */
export declare function getBatch(batchId: string): NotificationBatch | null;
/**
 * Get all batches
 */
export declare function getAllBatches(): readonly NotificationBatch[];
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<NotificationStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: NotificationEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: NotificationEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
