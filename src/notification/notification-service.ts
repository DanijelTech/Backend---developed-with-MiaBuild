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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA NOTIFICATION SERVICE
// ============================================================================

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
export type NotificationEventType =
    | 'notification_created'
    | 'notification_queued'
    | 'notification_sending'
    | 'notification_sent'
    | 'notification_delivered'
    | 'notification_failed'
    | 'notification_cancelled'
    | 'notification_retried'
    | 'batch_started'
    | 'batch_completed'
    | 'batch_failed'
    | 'template_created'
    | 'template_updated'
    | 'preferences_updated';

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

// ============================================================================
// STANJE
// ============================================================================

const notifications: Map<string, Notification> = new Map();
const templates: Map<string, NotificationTemplate> = new Map();
const preferences: Map<string, UserPreferences> = new Map();
const batches: Map<string, NotificationBatch> = new Map();
const providers: Map<NotificationChannel, ChannelProvider> = new Map();
const eventListeners: Set<NotificationEventListener> = new Set();
const pendingQueue: string[] = [];

let notificationCounter = 0;
let templateCounter = 0;
let batchCounter = 0;
let providerCounter = 0;
let eventCounter = 0;

const defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
};

const defaultRateLimitConfig: RateLimitConfig = {
    maxPerSecond: 100,
    maxPerMinute: 1000,
    maxPerHour: 10000,
    burstSize: 50,
};

const statistics: NotificationStatistics = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalPending: 0,
    byChannel: {
        email: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        sms: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        push: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        webhook: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        in_app: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        slack: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        teams: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
    },
    avgDeliveryTime: 0,
    deliveryRate: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate notification ID
 */
function generateNotificationId(): string {
    notificationCounter++;
    return generateDeterministicId(`notif-${notificationCounter}`);
}

/**
 * Generate template ID
 */
function generateTemplateId(): string {
    templateCounter++;
    return generateDeterministicId(`template-${templateCounter}`);
}

/**
 * Generate batch ID
 */
function generateBatchId(): string {
    batchCounter++;
    return generateDeterministicId(`batch-${batchCounter}`);
}

/**
 * Generate provider ID
 */
function generateProviderId(): string {
    providerCounter++;
    return generateDeterministicId(`provider-${providerCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`notif-event-${eventCounter}`);
}

/**
 * Emit notification event
 */
async function emitEvent(event: NotificationEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Render template
 */
function renderTemplate(template: string, data: Record<string, unknown>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
        const tokenPattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        result = result.replace(tokenPattern, String(value ?? ''));
    }
    
    return result;
}

/**
 * Calculate delay with backoff
 */
function calculateDelay(retryCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}

/**
 * Check quiet hours
 */
function isInQuietHours(quietHours: QuietHours | null): boolean {
    if (!quietHours || !quietHours.enabled) {
        return false;
    }
    
    const nowMs = clock.nowMs();
    const hour = Math.floor((nowMs % 86400000) / 3600000);
    
    if (quietHours.startHour < quietHours.endHour) {
        return hour >= quietHours.startHour && hour < quietHours.endHour;
    } else {
        return hour >= quietHours.startHour || hour < quietHours.endHour;
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalPending: number;
        deliveryRate: number;
    };
    
    mutableStats.totalPending = pendingQueue.length;
    
    const total = statistics.totalSent;
    if (total > 0) {
        mutableStats.deliveryRate = statistics.totalDelivered / total;
    }
}

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Create template
 */
export function createTemplate(
    name: string,
    channel: NotificationChannel,
    subject: string,
    body: string,
    options: {
        variables?: readonly TemplateVariable[];
        metadata?: Record<string, unknown>;
    } = {}
): NotificationTemplate {
    const templateId = generateTemplateId();
    const now = clock.nowMs();
    
    const template: NotificationTemplate = {
        templateId,
        name,
        channel,
        subject,
        body,
        variables: options.variables ?? [],
        version: 1,
        active: true,
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
    };
    
    templates.set(templateId, template);
    templates.set(name, template);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'template_created',
        notificationId: '',
        channel,
        timestamp: now,
        data: { templateId, name },
    });
    
    return template;
}

/**
 * Get template
 */
export function getTemplate(nameOrId: string): NotificationTemplate | null {
    return templates.get(nameOrId) ?? null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): readonly NotificationTemplate[] {
    const uniqueTemplates = new Map<string, NotificationTemplate>();
    for (const template of templates.values()) {
        uniqueTemplates.set(template.templateId, template);
    }
    return Array.from(uniqueTemplates.values());
}

/**
 * Update template
 */
export function updateTemplate(
    nameOrId: string,
    updates: {
        subject?: string;
        body?: string;
        variables?: readonly TemplateVariable[];
        active?: boolean;
        metadata?: Record<string, unknown>;
    }
): NotificationTemplate | null {
    const template = templates.get(nameOrId);
    if (!template) {
        return null;
    }
    
    const updatedTemplate: NotificationTemplate = {
        ...template,
        subject: updates.subject ?? template.subject,
        body: updates.body ?? template.body,
        variables: updates.variables ?? template.variables,
        active: updates.active ?? template.active,
        metadata: updates.metadata ?? template.metadata,
        version: template.version + 1,
        updatedAt: clock.nowMs(),
    };
    
    templates.set(template.templateId, updatedTemplate);
    templates.set(template.name, updatedTemplate);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'template_updated',
        notificationId: '',
        channel: template.channel,
        timestamp: clock.nowMs(),
        data: { templateId: template.templateId, version: updatedTemplate.version },
    });
    
    return updatedTemplate;
}

/**
 * Delete template
 */
export function deleteTemplate(nameOrId: string): boolean {
    const template = templates.get(nameOrId);
    if (!template) {
        return false;
    }
    
    templates.delete(template.templateId);
    templates.delete(template.name);
    
    return true;
}

// ============================================================================
// PROVIDER MANAGEMENT
// ============================================================================

/**
 * Register provider
 */
export function registerProvider(
    channel: NotificationChannel,
    name: string,
    send: ProviderSendFunction,
    options: {
        checkStatus?: ProviderStatusFunction;
        config?: Record<string, unknown>;
    } = {}
): ChannelProvider {
    const providerId = generateProviderId();
    
    const provider: ChannelProvider = {
        providerId,
        channel,
        name,
        send,
        checkStatus: options.checkStatus ?? null,
        config: options.config ?? {},
        active: true,
    };
    
    providers.set(channel, provider);
    
    return provider;
}

/**
 * Get provider
 */
export function getProvider(channel: NotificationChannel): ChannelProvider | null {
    return providers.get(channel) ?? null;
}

/**
 * Get all providers
 */
export function getAllProviders(): readonly ChannelProvider[] {
    return Array.from(providers.values());
}

/**
 * Remove provider
 */
export function removeProvider(channel: NotificationChannel): boolean {
    return providers.delete(channel);
}

// ============================================================================
// PREFERENCE MANAGEMENT
// ============================================================================

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences | null {
    return preferences.get(userId) ?? null;
}

/**
 * Set user preferences
 */
export function setUserPreferences(
    userId: string,
    prefs: Partial<Omit<UserPreferences, 'userId' | 'updatedAt'>>
): UserPreferences {
    const existing = preferences.get(userId);
    
    const defaultChannels: Record<NotificationChannel, ChannelPreference> = {
        email: { enabled: true, address: null, verified: false },
        sms: { enabled: false, address: null, verified: false },
        push: { enabled: true, address: null, verified: false },
        webhook: { enabled: false, address: null, verified: false },
        in_app: { enabled: true, address: null, verified: false },
        slack: { enabled: false, address: null, verified: false },
        teams: { enabled: false, address: null, verified: false },
    };
    
    const userPrefs: UserPreferences = {
        userId,
        channels: prefs.channels ?? existing?.channels ?? defaultChannels,
        quietHours: prefs.quietHours ?? existing?.quietHours ?? null,
        frequency: prefs.frequency ?? existing?.frequency ?? {
            maxPerHour: 100,
            maxPerDay: 1000,
            digestEnabled: false,
            digestTime: null,
        },
        categories: prefs.categories ?? existing?.categories ?? {},
        updatedAt: clock.nowMs(),
    };
    
    preferences.set(userId, userPrefs);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'preferences_updated',
        notificationId: '',
        channel: 'email',
        timestamp: clock.nowMs(),
        data: { userId },
    });
    
    return userPrefs;
}

/**
 * Delete user preferences
 */
export function deleteUserPreferences(userId: string): boolean {
    return preferences.delete(userId);
}

// ============================================================================
// NOTIFICATION SENDING
// ============================================================================

/**
 * Send notification
 */
export async function send(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    subject: string,
    body: string,
    options: {
        priority?: NotificationPriority;
        templateId?: string;
        templateData?: Record<string, unknown>;
        scheduledAt?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Notification> {
    const notificationId = generateNotificationId();
    const now = clock.nowMs();
    
    let finalSubject = subject;
    let finalBody = body;
    
    if (options.templateId) {
        const template = templates.get(options.templateId);
        if (template && template.active) {
            finalSubject = renderTemplate(template.subject, options.templateData ?? {});
            finalBody = renderTemplate(template.body, options.templateData ?? {});
        }
    }
    
    const notification: Notification = {
        notificationId,
        channel,
        recipient,
        subject: finalSubject,
        body: finalBody,
        priority: options.priority ?? 'normal',
        status: 'pending',
        templateId: options.templateId ?? null,
        templateData: options.templateData ?? {},
        scheduledAt: options.scheduledAt ?? null,
        sentAt: null,
        deliveredAt: null,
        failedAt: null,
        retryCount: 0,
        error: null,
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
    };
    
    notifications.set(notificationId, notification);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'notification_created',
        notificationId,
        channel,
        timestamp: now,
        data: { recipientId: recipient.recipientId },
    });
    
    if (options.scheduledAt && options.scheduledAt > now) {
        return notification;
    }
    
    return processNotification(notificationId);
}

/**
 * Send using template
 */
export async function sendWithTemplate(
    templateNameOrId: string,
    recipient: NotificationRecipient,
    data: Record<string, unknown>,
    options: {
        priority?: NotificationPriority;
        scheduledAt?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Notification> {
    const template = templates.get(templateNameOrId);
    if (!template) {
        throw new Error(`Template '${templateNameOrId}' not found`);
    }
    
    if (!template.active) {
        throw new Error(`Template '${templateNameOrId}' is not active`);
    }
    
    for (const variable of template.variables) {
        if (variable.required && !(variable.name in data)) {
            throw new Error(`Required variable '${variable.name}' is missing`);
        }
    }
    
    const templateData: Record<string, unknown> = {};
    for (const variable of template.variables) {
        templateData[variable.name] = data[variable.name] ?? variable.defaultValue;
    }
    
    return send(template.channel, recipient, template.subject, template.body, {
        ...options,
        templateId: template.templateId,
        templateData,
    });
}

/**
 * Send to multiple recipients
 */
export async function sendBulk(
    channel: NotificationChannel,
    recipients: readonly NotificationRecipient[],
    subject: string,
    body: string,
    options: {
        priority?: NotificationPriority;
        templateId?: string;
        templateData?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<NotificationBatch> {
    const batchId = generateBatchId();
    const notificationIds: string[] = [];
    
    for (const recipient of recipients) {
        const notification = await send(channel, recipient, subject, body, {
            ...options,
            metadata: { ...options.metadata, batchId },
        });
        notificationIds.push(notification.notificationId);
    }
    
    const batch: NotificationBatch = {
        batchId,
        notifications: notificationIds,
        status: 'processing',
        totalCount: recipients.length,
        sentCount: 0,
        failedCount: 0,
        startedAt: clock.nowMs(),
        completedAt: null,
        metadata: options.metadata ?? {},
    };
    
    batches.set(batchId, batch);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'batch_started',
        notificationId: '',
        channel,
        timestamp: clock.nowMs(),
        data: { batchId, totalCount: recipients.length },
    });
    
    return batch;
}

/**
 * Process notification
 */
async function processNotification(notificationId: string): Promise<Notification> {
    let notification = notifications.get(notificationId);
    if (!notification) {
        throw new Error(`Notification '${notificationId}' not found`);
    }
    
    const userPrefs = preferences.get(notification.recipient.recipientId);
    
    if (userPrefs) {
        const channelPref = userPrefs.channels[notification.channel];
        if (!channelPref.enabled) {
            notification = {
                ...notification,
                status: 'cancelled',
                error: 'Channel disabled by user preferences',
                updatedAt: clock.nowMs(),
            };
            notifications.set(notificationId, notification);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_cancelled',
                notificationId,
                channel: notification.channel,
                timestamp: clock.nowMs(),
                data: { reason: 'channel_disabled' },
            });
            
            return notification;
        }
        
        if (notification.priority !== 'urgent' && isInQuietHours(userPrefs.quietHours)) {
            pendingQueue.push(notificationId);
            
            notification = {
                ...notification,
                status: 'queued',
                updatedAt: clock.nowMs(),
            };
            notifications.set(notificationId, notification);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_queued',
                notificationId,
                channel: notification.channel,
                timestamp: clock.nowMs(),
                data: { reason: 'quiet_hours' },
            });
            
            return notification;
        }
    }
    
    const provider = providers.get(notification.channel);
    if (!provider || !provider.active) {
        notification = {
            ...notification,
            status: 'failed',
            error: `No active provider for channel '${notification.channel}'`,
            failedAt: clock.nowMs(),
            updatedAt: clock.nowMs(),
        };
        notifications.set(notificationId, notification);
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'notification_failed',
            notificationId,
            channel: notification.channel,
            timestamp: clock.nowMs(),
            data: { error: notification.error },
        });
        
        return notification;
    }
    
    notification = {
        ...notification,
        status: 'sending',
        updatedAt: clock.nowMs(),
    };
    notifications.set(notificationId, notification);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'notification_sending',
        notificationId,
        channel: notification.channel,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    try {
        const result = await provider.send(notification);
        
        if (result.success) {
            const sentAt = clock.nowMs();
            
            notification = {
                ...notification,
                status: 'sent',
                sentAt,
                metadata: { ...notification.metadata, messageId: result.messageId },
                updatedAt: sentAt,
            };
            notifications.set(notificationId, notification);
            
            const mutableStats = statistics as { totalSent: number };
            mutableStats.totalSent++;
            
            const channelStats = statistics.byChannel[notification.channel] as { sent: number };
            channelStats.sent++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_sent',
                notificationId,
                channel: notification.channel,
                timestamp: sentAt,
                data: { messageId: result.messageId },
            });
        } else {
            throw new Error(result.error ?? 'Unknown error');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (notification.retryCount < defaultRetryPolicy.maxRetries) {
            const delay = calculateDelay(notification.retryCount, defaultRetryPolicy);
            
            notification = {
                ...notification,
                retryCount: notification.retryCount + 1,
                status: 'pending',
                updatedAt: clock.nowMs(),
            };
            notifications.set(notificationId, notification);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_retried',
                notificationId,
                channel: notification.channel,
                timestamp: clock.nowMs(),
                data: { retryCount: notification.retryCount, delay },
            });
            
            setTimeout(() => processNotification(notificationId), delay);
        } else {
            notification = {
                ...notification,
                status: 'failed',
                error: errorMessage,
                failedAt: clock.nowMs(),
                updatedAt: clock.nowMs(),
            };
            notifications.set(notificationId, notification);
            
            const mutableStats = statistics as { totalFailed: number };
            mutableStats.totalFailed++;
            
            const channelStats = statistics.byChannel[notification.channel] as { failed: number };
            channelStats.failed++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_failed',
                notificationId,
                channel: notification.channel,
                timestamp: clock.nowMs(),
                data: { error: errorMessage, retryCount: notification.retryCount },
            });
        }
    }
    
    updateStatistics();
    
    return notification;
}

/**
 * Mark as delivered
 */
export async function markDelivered(notificationId: string): Promise<Notification | null> {
    let notification = notifications.get(notificationId);
    if (!notification) {
        return null;
    }
    
    const deliveredAt = clock.nowMs();
    
    notification = {
        ...notification,
        status: 'delivered',
        deliveredAt,
        updatedAt: deliveredAt,
    };
    notifications.set(notificationId, notification);
    
    const mutableStats = statistics as { totalDelivered: number; avgDeliveryTime: number };
    mutableStats.totalDelivered++;
    
    if (notification.sentAt) {
        const deliveryTime = deliveredAt - notification.sentAt;
        const totalTime = mutableStats.avgDeliveryTime * (mutableStats.totalDelivered - 1) + deliveryTime;
        mutableStats.avgDeliveryTime = totalTime / mutableStats.totalDelivered;
    }
    
    const channelStats = statistics.byChannel[notification.channel] as { delivered: number };
    channelStats.delivered++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'notification_delivered',
        notificationId,
        channel: notification.channel,
        timestamp: deliveredAt,
        data: {},
    });
    
    updateStatistics();
    
    return notification;
}

/**
 * Cancel notification
 */
export async function cancel(notificationId: string): Promise<Notification | null> {
    let notification = notifications.get(notificationId);
    if (!notification) {
        return null;
    }
    
    if (notification.status === 'sent' || notification.status === 'delivered') {
        return null;
    }
    
    notification = {
        ...notification,
        status: 'cancelled',
        updatedAt: clock.nowMs(),
    };
    notifications.set(notificationId, notification);
    
    const queueIndex = pendingQueue.indexOf(notificationId);
    if (queueIndex !== -1) {
        pendingQueue.splice(queueIndex, 1);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'notification_cancelled',
        notificationId,
        channel: notification.channel,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return notification;
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Get notification
 */
export function getNotification(notificationId: string): Notification | null {
    return notifications.get(notificationId) ?? null;
}

/**
 * Get all notifications
 */
export function getAllNotifications(): readonly Notification[] {
    return Array.from(notifications.values());
}

/**
 * Get notifications by recipient
 */
export function getNotificationsByRecipient(recipientId: string): readonly Notification[] {
    return Array.from(notifications.values()).filter(n => n.recipient.recipientId === recipientId);
}

/**
 * Get notifications by status
 */
export function getNotificationsByStatus(status: NotificationStatus): readonly Notification[] {
    return Array.from(notifications.values()).filter(n => n.status === status);
}

/**
 * Get notifications by channel
 */
export function getNotificationsByChannel(channel: NotificationChannel): readonly Notification[] {
    return Array.from(notifications.values()).filter(n => n.channel === channel);
}

/**
 * Get batch
 */
export function getBatch(batchId: string): NotificationBatch | null {
    return batches.get(batchId) ?? null;
}

/**
 * Get all batches
 */
export function getAllBatches(): readonly NotificationBatch[] {
    return Array.from(batches.values());
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<NotificationStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalPending: 0,
        byChannel: {
            email: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            sms: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            push: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            webhook: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            in_app: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            slack: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
            teams: { sent: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 },
        },
        avgDeliveryTime: 0,
        deliveryRate: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: NotificationEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: NotificationEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    notifications.clear();
    templates.clear();
    preferences.clear();
    batches.clear();
    providers.clear();
    eventListeners.clear();
    pendingQueue.length = 0;
    resetStatistics();
}
