import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Notification } from '../models/notification.model.js';

// ─── GET MY NOTIFICATIONS ───────────────────────────────────
// GET /api/v1/notifications
const getMyNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const filter = { recipient: req.user._id };
    if (unreadOnly === "true") filter.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("relatedCourse", "title thumbnail"),
        Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched")
    );
});

// ─── MARK ONE AS READ ───────────────────────────────────────
// PATCH /api/v1/notifications/:notificationId/read
const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { isRead: true },
        { new: true }
    );

    if (!notification) throw new ApiError(404, "Notification not found");

    return res.status(200).json(
        new ApiResponse(200, notification, "Marked as read")
    );
});

// ─── MARK ALL AS READ ───────────────────────────────────────
// PATCH /api/v1/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "All notifications marked as read")
    );
});

// ─── DELETE A NOTIFICATION ──────────────────────────────────
// DELETE /api/v1/notifications/:notificationId
const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: req.user._id,
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Notification deleted")
    );
});

export { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };