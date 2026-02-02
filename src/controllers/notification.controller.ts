import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import sendResponse from '../utils/responseHandler';

/**
 * Get all notifications for the logged-in user
 */
const getUserNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'Unauthorized');
            return;
        }

        const includeRead = req.query.includeRead !== 'false'; // Default true
        const notifications = await notificationService.getUserNotifications(userId, includeRead);

        sendResponse(res, 200, true, 'Notifications fetched successfully', notifications);
    } catch (error) {
        next(error);
    }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'Unauthorized');
            return;
        }

        const count = await notificationService.getUnreadCount(userId);
        sendResponse(res, 200, true, 'Unread count fetched', { count });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a notification as read
 */
const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const notification = await notificationService.markAsRead(id);

        sendResponse(res, 200, true, 'Notification marked as read', notification);
    } catch (error) {
        next(error);
    }
};

/**
 * Soft delete a notification
 */
const deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const notification = await notificationService.softDelete(id);

        sendResponse(res, 200, true, 'Notification deleted successfully', notification);
    } catch (error) {
        next(error);
    }
};

export { getUserNotifications, getUnreadCount, markAsRead, deleteNotification };
