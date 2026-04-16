// swift-app/ClaudeNotifier/StateWatcher.swift
// Watches ~/.claude-notifier/state.json for writes using DispatchSource
// (no polling). Falls back to a 500ms timer if the file doesn't exist yet.
import Foundation

final class StateWatcher {
    private let statePath: String
    private var source:         DispatchSourceFileSystemObject?
    private var fileDescriptor: Int32 = -1
    private var fallbackTimer:  Timer?
    private let onChange: (String) -> Void

    private static let validStates = [
        "idle", "pending_low", "pending_medium", "pending_high", "celebrating"
    ]

    init(onChange: @escaping (String) -> Void) {
        let base = (NSHomeDirectory() as NSString)
            .appendingPathComponent(".claude-notifier")
        self.statePath = (base as NSString).appendingPathComponent("state.json")
        self.onChange  = onChange

        // Ensure ~/.claude-notifier/ exists
        try? FileManager.default.createDirectory(
            atPath: base, withIntermediateDirectories: true)

        startWatching()
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private func startWatching() {
        fileDescriptor = open(statePath, O_EVTONLY)
        if fileDescriptor < 0 {
            // File not yet created — retry via timer
            startFallbackTimer()
            return
        }
        cancelFallbackTimer()

        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask:      .write,
            queue:          .main
        )
        src.setEventHandler { [weak self] in self?.readAndNotify() }
        src.setCancelHandler { [weak self] in
            if let fd = self?.fileDescriptor, fd >= 0 { close(fd) }
        }
        src.resume()
        source = src
    }

    private func startFallbackTimer() {
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self else { return }
            if FileManager.default.fileExists(atPath: self.statePath) {
                self.cancelFallbackTimer()
                self.startWatching()
            }
        }
    }

    private func cancelFallbackTimer() {
        fallbackTimer?.invalidate()
        fallbackTimer = nil
    }

    // ── Public ────────────────────────────────────────────────────────────────

    /// Call once on launch to apply the current state before any write event fires.
    func readAndNotify() {
        guard
            let data   = FileManager.default.contents(atPath: statePath),
            let json   = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let status = json["status"] as? String,
            Self.validStates.contains(status)
        else { return }
        onChange(status)
    }

    deinit {
        source?.cancel()
        cancelFallbackTimer()
    }
}
