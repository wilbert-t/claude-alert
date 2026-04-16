// swift-app/ClaudeNotifier/ApprovalWatcher.swift
import Foundation

final class ApprovalWatcher {
    private let pendingPath:    String
    private var source:         DispatchSourceFileSystemObject?
    private var fileDescriptor: Int32 = -1
    private var fallbackTimer:  Timer?
    private var lastProcessedId: String?
    private let onApproval: (_ id: String, _ tool: String, _ command: String,
                              _ risk: String, _ impact: String,
                              _ sourceApp: String?, _ sourceBundleId: String?, _ sourceCwd: String?) -> Void
    private let onDismiss: () -> Void

    init(onApproval: @escaping (_ id: String, _ tool: String, _ command: String,
                                 _ risk: String, _ impact: String,
                                 _ sourceApp: String?, _ sourceBundleId: String?, _ sourceCwd: String?) -> Void,
         onDismiss: @escaping () -> Void) {
        let base = (NSHomeDirectory() as NSString).appendingPathComponent(".claude-notifier")
        self.pendingPath = (base as NSString).appendingPathComponent("pending-approval.json")
        self.onApproval  = onApproval
        self.onDismiss   = onDismiss
        try? FileManager.default.createDirectory(atPath: base, withIntermediateDirectories: true)
        startWatching()
    }

    // MARK: – File watching

    private func startWatching() {
        fileDescriptor = open(pendingPath, O_EVTONLY)
        guard fileDescriptor >= 0 else {
            startFallbackTimer()   // file doesn't exist yet — retry
            return
        }
        cancelFallbackTimer()

        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask: [.write, .delete, .rename],
            queue: .main
        )
        src.setEventHandler { [weak self] in
            guard let self else { return }
            let data = src.data
            if data.contains(.write) {
                self.readAndFire()
            }
            if data.contains(.delete) || data.contains(.rename) {
                // File removed — terminal answered the dialog, dismiss the notification
                self.onDismiss()
                src.cancel()
                self.source = nil
                self.startFallbackTimer()
            }
        }
        src.setCancelHandler { [weak self] in
            if let fd = self?.fileDescriptor, fd >= 0 { close(fd) }
            self?.fileDescriptor = -1
        }
        src.resume()
        source = src

        // Handle the current file content immediately to avoid missing the first
        // write that can occur before the fs event source is attached.
        readAndFire()
    }

    private func startFallbackTimer() {
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self else { return }
            if FileManager.default.fileExists(atPath: self.pendingPath) {
                self.cancelFallbackTimer()
                self.startWatching()
            }
        }
    }

    private func cancelFallbackTimer() {
        fallbackTimer?.invalidate()
        fallbackTimer = nil
    }

    // MARK: – Read file and fire callback

    func readAndFire() {
        guard
            let data    = FileManager.default.contents(atPath: pendingPath),
            let json    = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let id      = json["id"]      as? String,
            let tool    = json["tool"]    as? String,
            let command = json["command"] as? String,
            let risk    = json["risk"]    as? String,
            let impact  = json["impact"]  as? String
        else { return }

        guard id != lastProcessedId else { return }
        lastProcessedId = id

        let sourceApp = json["sourceApp"] as? String
        let sourceBundleId = json["sourceBundleId"] as? String
        let sourceCwd = json["sourceCwd"] as? String
        onApproval(id, tool, command, risk, impact, sourceApp, sourceBundleId, sourceCwd)
    }

    deinit {
        source?.cancel()
        cancelFallbackTimer()
    }
}
