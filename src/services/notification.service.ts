import prisma from '../config/db';

type NotificationType = 'INFO' | 'WARNING' | 'ERROR';

/**
 * Create a new notification for a user
 */
const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO'
) => {
    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type
        }
    });

    return notification;
};

/**
 * Get all notifications for a user
 * @param includeRead - Include read notifications (default: true)
 */
const getUserNotifications = async (userId: string, includeRead: boolean = true) => {
    const notifications = await prisma.notification.findMany({
        where: {
            userId,
            isDeleted: false,
            ...(includeRead ? {} : { isRead: false })
        },
        orderBy: { createdAt: 'desc' }
    });

    return notifications;
};

/**
 * Mark a notification as read
 */
const markAsRead = async (notificationId: string) => {
    const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    });

    return notification;
};

/**
 * Soft delete a notification
 */
const softDelete = async (notificationId: string) => {
    const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isDeleted: true }
    });

    return notification;
};

/**
 * Delete notifications by title pattern
 * Useful for auto-cleanup when issues are resolved
 * e.g., deleteRelatedNotifications(userId, 'Subscription Limit')
 */
const deleteRelatedNotifications = async (userId: string, titlePattern: string) => {
    const result = await prisma.notification.updateMany({
        where: {
            userId,
            title: {
                contains: titlePattern
            },
            isDeleted: false
        },
        data: { isDeleted: true }
    });

    return result;
};

/**
 * Get unread notification count for a user
 */
const getUnreadCount = async (userId: string) => {
    const count = await prisma.notification.count({
        where: {
            userId,
            isRead: false,
            isDeleted: false
        }
    });

    return count;
};

/**
 * Soft delete all notifications for a user
 */
const markAllAsDeleted = async (userId: string) => {
    const result = await prisma.notification.updateMany({
        where: {
            userId,
            isDeleted: false
        },
        data: { isDeleted: true }
    });

    return result;
};

export {
    createNotification,
    getUserNotifications,
    markAsRead,
    softDelete,
    deleteRelatedNotifications,
    getUnreadCount,
    markAllAsDeleted
};
