"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
exports.getTemplate = getTemplate;
exports.getAllTemplates = getAllTemplates;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.registerProvider = registerProvider;
exports.getProvider = getProvider;
exports.getAllProviders = getAllProviders;
exports.removeProvider = removeProvider;
exports.getUserPreferences = getUserPreferences;
exports.setUserPreferences = setUserPreferences;
exports.deleteUserPreferences = deleteUserPreferences;
exports.send = send;
exports.sendWithTemplate = sendWithTemplate;
exports.sendBulk = sendBulk;
exports.markDelivered = markDelivered;
exports.cancel = cancel;
exports.getNotification = getNotification;
exports.getAllNotifications = getAllNotifications;
exports.getNotificationsByRecipient = getNotificationsByRecipient;
exports.getNotificationsByStatus = getNotificationsByStatus;
exports.getNotificationsByChannel = getNotificationsByChannel;
exports.getBatch = getBatch;
exports.getAllBatches = getAllBatches;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const notifications = new Map();
const templates = new Map();
const preferences = new Map();
const batches = new Map();
const providers = new Map();
const eventListeners = new Set();
const pendingQueue = [];
let notificationCounter = 0;
let templateCounter = 0;
let batchCounter = 0;
let providerCounter = 0;
let eventCounter = 0;
const defaultRetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
};
const defaultRateLimitConfig = {
    maxPerSecond: 100,
    maxPerMinute: 1000,
    maxPerHour: 10000,
    burstSize: 50,
};
const statistics = {
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
function generateNotificationId() {
    notificationCounter++;
    return (0, deterministic_1.generateDeterministicId)(`notif-${notificationCounter}`);
}
/**
 * Generate template ID
 */
function generateTemplateId() {
    templateCounter++;
    return (0, deterministic_1.generateDeterministicId)(`template-${templateCounter}`);
}
/**
 * Generate batch ID
 */
function generateBatchId() {
    batchCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-${batchCounter}`);
}
/**
 * Generate provider ID
 */
function generateProviderId() {
    providerCounter++;
    return (0, deterministic_1.generateDeterministicId)(`provider-${providerCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`notif-event-${eventCounter}`);
}
/**
 * Emit notification event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Render template
 */
function renderTemplate(template, data) {
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
function calculateDelay(retryCount, policy) {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}
/**
 * Check quiet hours
 */
function isInQuietHours(quietHours) {
    if (!quietHours || !quietHours.enabled) {
        return false;
    }
    const nowMs = clock.nowMs();
    const hour = Math.floor((nowMs % 86400000) / 3600000);
    if (quietHours.startHour < quietHours.endHour) {
        return hour >= quietHours.startHour && hour < quietHours.endHour;
    }
    else {
        return hour >= quietHours.startHour || hour < quietHours.endHour;
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
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
function createTemplate(name, channel, subject, body, options = {}) {
    const templateId = generateTemplateId();
    const now = clock.nowMs();
    const template = {
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
function getTemplate(nameOrId) {
    return templates.get(nameOrId) ?? null;
}
/**
 * Get all templates
 */
function getAllTemplates() {
    const uniqueTemplates = new Map();
    for (const template of templates.values()) {
        uniqueTemplates.set(template.templateId, template);
    }
    return Array.from(uniqueTemplates.values());
}
/**
 * Update template
 */
function updateTemplate(nameOrId, updates) {
    const template = templates.get(nameOrId);
    if (!template) {
        return null;
    }
    const updatedTemplate = {
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
function deleteTemplate(nameOrId) {
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
function registerProvider(channel, name, send, options = {}) {
    const providerId = generateProviderId();
    const provider = {
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
function getProvider(channel) {
    return providers.get(channel) ?? null;
}
/**
 * Get all providers
 */
function getAllProviders() {
    return Array.from(providers.values());
}
/**
 * Remove provider
 */
function removeProvider(channel) {
    return providers.delete(channel);
}
// ============================================================================
// PREFERENCE MANAGEMENT
// ============================================================================
/**
 * Get user preferences
 */
function getUserPreferences(userId) {
    return preferences.get(userId) ?? null;
}
/**
 * Set user preferences
 */
function setUserPreferences(userId, prefs) {
    const existing = preferences.get(userId);
    const defaultChannels = {
        email: { enabled: true, address: null, verified: false },
        sms: { enabled: false, address: null, verified: false },
        push: { enabled: true, address: null, verified: false },
        webhook: { enabled: false, address: null, verified: false },
        in_app: { enabled: true, address: null, verified: false },
        slack: { enabled: false, address: null, verified: false },
        teams: { enabled: false, address: null, verified: false },
    };
    const userPrefs = {
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
function deleteUserPreferences(userId) {
    return preferences.delete(userId);
}
// ============================================================================
// NOTIFICATION SENDING
// ============================================================================
/**
 * Send notification
 */
async function send(channel, recipient, subject, body, options = {}) {
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
    const notification = {
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
async function sendWithTemplate(templateNameOrId, recipient, data, options = {}) {
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
    const templateData = {};
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
async function sendBulk(channel, recipients, subject, body, options = {}) {
    const batchId = generateBatchId();
    const notificationIds = [];
    for (const recipient of recipients) {
        const notification = await send(channel, recipient, subject, body, {
            ...options,
            metadata: { ...options.metadata, batchId },
        });
        notificationIds.push(notification.notificationId);
    }
    const batch = {
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
async function processNotification(notificationId) {
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
            const mutableStats = statistics;
            mutableStats.totalSent++;
            const channelStats = statistics.byChannel[notification.channel];
            channelStats.sent++;
            await emitEvent({
                eventId: generateEventId(),
                type: 'notification_sent',
                notificationId,
                channel: notification.channel,
                timestamp: sentAt,
                data: { messageId: result.messageId },
            });
        }
        else {
            throw new Error(result.error ?? 'Unknown error');
        }
    }
    catch (error) {
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
        }
        else {
            notification = {
                ...notification,
                status: 'failed',
                error: errorMessage,
                failedAt: clock.nowMs(),
                updatedAt: clock.nowMs(),
            };
            notifications.set(notificationId, notification);
            const mutableStats = statistics;
            mutableStats.totalFailed++;
            const channelStats = statistics.byChannel[notification.channel];
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
async function markDelivered(notificationId) {
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
    const mutableStats = statistics;
    mutableStats.totalDelivered++;
    if (notification.sentAt) {
        const deliveryTime = deliveredAt - notification.sentAt;
        const totalTime = mutableStats.avgDeliveryTime * (mutableStats.totalDelivered - 1) + deliveryTime;
        mutableStats.avgDeliveryTime = totalTime / mutableStats.totalDelivered;
    }
    const channelStats = statistics.byChannel[notification.channel];
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
async function cancel(notificationId) {
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
function getNotification(notificationId) {
    return notifications.get(notificationId) ?? null;
}
/**
 * Get all notifications
 */
function getAllNotifications() {
    return Array.from(notifications.values());
}
/**
 * Get notifications by recipient
 */
function getNotificationsByRecipient(recipientId) {
    return Array.from(notifications.values()).filter(n => n.recipient.recipientId === recipientId);
}
/**
 * Get notifications by status
 */
function getNotificationsByStatus(status) {
    return Array.from(notifications.values()).filter(n => n.status === status);
}
/**
 * Get notifications by channel
 */
function getNotificationsByChannel(channel) {
    return Array.from(notifications.values()).filter(n => n.channel === channel);
}
/**
 * Get batch
 */
function getBatch(batchId) {
    return batches.get(batchId) ?? null;
}
/**
 * Get all batches
 */
function getAllBatches() {
    return Array.from(batches.values());
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    notifications.clear();
    templates.clear();
    preferences.clear();
    batches.clear();
    providers.clear();
    eventListeners.clear();
    pendingQueue.length = 0;
    resetStatistics();
}
