// swift-app/ClaudeNotifier/ClaudeNotifierApp.swift
import SwiftUI
import AppKit

@main
struct ClaudeNotifierApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        // Pure menu bar app — no windows. Settings scene prevents SwiftUI
        // from opening a default window on launch.
        Settings { EmptyView() }
    }
}

@MainActor
class AppDelegate: NSObject, NSApplicationDelegate {
    var controller:             StatusBarController?
    var notificationController: NotificationController?
    var approvalWatcher:        ApprovalWatcher?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        // Generate animation frames and start menu bar controller
        let frames = generateFrames()
        let f = frames.isEmpty ? fallbackFrames() : frames
        controller = StatusBarController(frames: f)

        // Set up notification-based approve/reject
        notificationController = NotificationController()
        approvalWatcher = ApprovalWatcher(
            onApproval: { [weak self] id, tool, command, risk, impact, sourceApp, sourceBundleId, sourceCwd in
                self?.notificationController?.showApproval(
                    id: id, tool: tool, command: command, risk: risk, impact: impact,
                    sourceApp: sourceApp, sourceBundleId: sourceBundleId, sourceCwd: sourceCwd
                )
            },
            onDismiss: { [weak self] in
                self?.notificationController?.dismissCurrent()
            }
        )
    }
}
