// swift-app/ClaudeNotifier/FrameGenerator.swift
// Pre-renders 20 NSImage frames (5 states × 4 poses) at app launch
// using SwiftUI ImageRenderer. Must be called on the @MainActor.
import SwiftUI
import AppKit

struct FrameDef {
    let state:      CharacterState
    let rotation:   Double
    let xOffset:    Double
    let yOffset:    Double
    let scale:      Double
    let glowRadius: Double
}

/// All 20 frame definitions. Order within each array = animation cycle.
private let allFrameDefs: [String: [FrameDef]] = [
    "idle": [
        FrameDef(state: .idle, rotation: -5, xOffset:  0, yOffset: 0, scale: 1,    glowRadius: 0),
        FrameDef(state: .idle, rotation: -2, xOffset:  0, yOffset: 0, scale: 1,    glowRadius: 0),
        FrameDef(state: .idle, rotation:  2, xOffset:  0, yOffset: 0, scale: 1,    glowRadius: 0),
        FrameDef(state: .idle, rotation:  5, xOffset:  0, yOffset: 0, scale: 1,    glowRadius: 0),
    ],
    "pending_low": [
        FrameDef(state: .pendingLow, rotation: -2, xOffset: -2, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingLow, rotation:  0, xOffset:  0, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingLow, rotation:  2, xOffset:  2, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingLow, rotation:  0, xOffset:  0, yOffset: 0, scale: 1, glowRadius: 0),
    ],
    "pending_medium": [
        FrameDef(state: .pendingMedium, rotation: -3, xOffset: -3, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingMedium, rotation:  0, xOffset:  0, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingMedium, rotation:  3, xOffset:  3, yOffset: 0, scale: 1, glowRadius: 0),
        FrameDef(state: .pendingMedium, rotation:  0, xOffset:  0, yOffset: 0, scale: 1, glowRadius: 0),
    ],
    "pending_high": [
        FrameDef(state: .pendingHigh, rotation: -4, xOffset: -4, yOffset: 0, scale: 1,   glowRadius: 3),
        FrameDef(state: .pendingHigh, rotation:  0, xOffset:  0, yOffset: 0, scale: 1,   glowRadius: 5),
        FrameDef(state: .pendingHigh, rotation:  4, xOffset:  4, yOffset: 0, scale: 1,   glowRadius: 3),
        FrameDef(state: .pendingHigh, rotation:  0, xOffset:  0, yOffset: 0, scale: 1,   glowRadius: 5),
    ],
    "celebrating": [
        FrameDef(state: .celebrating, rotation:   0, xOffset: 0, yOffset:  0, scale: 1.00, glowRadius: 2),
        FrameDef(state: .celebrating, rotation: -10, xOffset: 0, yOffset: -3, scale: 1.10, glowRadius: 4),
        FrameDef(state: .celebrating, rotation:  10, xOffset: 0, yOffset: -5, scale: 1.10, glowRadius: 4),
        FrameDef(state: .celebrating, rotation:  -5, xOffset: 0, yOffset: -3, scale: 1.05, glowRadius: 2),
    ],
]

/// Renders all 20 frames using ImageRenderer and returns them as a
/// dictionary keyed by state name. Must be called on the main actor.
@MainActor
func generateFrames() -> [String: [NSImage]] {
    var result: [String: [NSImage]] = [:]

    for (stateName, defs) in allFrameDefs {
        var images: [NSImage] = []
        for def in defs {
            let view = ClaudeLogoView(
                charState:  def.state,
                rotation:   def.rotation,
                xOffset:    def.xOffset,
                yOffset:    def.yOffset,
                scale:      def.scale,
                glowRadius: def.glowRadius
            )
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2.0  // @2x — crisp on Retina displays
            if let image = renderer.nsImage {
                images.append(image)
            }
        }
        if !images.isEmpty {
            result[stateName] = images
        }
    }

    return result
}

/// Single-frame fallback used when generateFrames() produces no images.
@MainActor
func fallbackFrames() -> [String: [NSImage]] {
    let view = ClaudeLogoView(
        charState: .idle, rotation: 0, xOffset: 0,
        yOffset: 0, scale: 1, glowRadius: 0
    )
    let renderer = ImageRenderer(content: view)
    renderer.scale = 2.0
    let img = renderer.nsImage ?? NSImage()
    return Dictionary(uniqueKeysWithValues: CharacterState.all.map { ($0.rawValue, [img]) })
}
