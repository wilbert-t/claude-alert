// swift-app/ClaudeNotifier/ClaudeLogoView.swift
// Draws the Claude robot logo as SwiftUI Shapes, scaled to any rect.
// Coordinates match the SVG viewBox="0 0 24 24".
import SwiftUI

// ── Body ──────────────────────────────────────────────────────────────────────

/// The full robot silhouette (head + arms + legs) as one filled shape.
struct ClaudeBodyShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width  / 24
        let sy = rect.height / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }
        var path = Path()
        path.move(to: p(20.998, 10.949))
        path.addLine(to: p(24,     10.949))
        path.addLine(to: p(24,     14.051))
        path.addLine(to: p(21,     14.051))
        path.addLine(to: p(21,     17.079))
        path.addLine(to: p(19.513, 17.079))
        path.addLine(to: p(19.513, 20))
        path.addLine(to: p(18,     20))
        path.addLine(to: p(18,     17.079))
        path.addLine(to: p(16.513, 17.079))
        path.addLine(to: p(16.513, 20))
        path.addLine(to: p(15,     20))
        path.addLine(to: p(15,     17.079))
        path.addLine(to: p(9,      17.079))
        path.addLine(to: p(9,      20))
        path.addLine(to: p(7.488,  20))
        path.addLine(to: p(7.488,  17.079))
        path.addLine(to: p(6,      17.079))
        path.addLine(to: p(6,      20))
        path.addLine(to: p(4.487,  20))
        path.addLine(to: p(4.487,  17.079))
        path.addLine(to: p(3,      17.079))
        path.addLine(to: p(3,      14.05))
        path.addLine(to: p(0,      14.05))
        path.addLine(to: p(0,      10.95))
        path.addLine(to: p(3,      10.95))
        path.addLine(to: p(3,      5))
        path.addLine(to: p(20.998, 5))
        path.closeSubpath()
        return path
    }
}

// ── Eyes ──────────────────────────────────────────────────────────────────────

/// One eye chevron. Left eye: >, right eye: < (set isLeft accordingly).
struct ClaudeEyeShape: Shape {
    let isLeft: Bool

    func path(in rect: CGRect) -> Path {
        let sx = rect.width  / 24
        let sy = rect.height / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }
        var path = Path()
        if isLeft {
            // Left eye: > (vertex at x=8.1)
            path.move(to: p(5.6, 8.1))
            path.addLine(to: p(8.1, 9.5))
            path.addLine(to: p(5.6, 10.9))
        } else {
            // Right eye: < (vertex at x=15.9)
            path.move(to: p(18.4, 8.1))
            path.addLine(to: p(15.9, 9.5))
            path.addLine(to: p(18.4, 10.9))
        }
        return path
    }
}

// ── Composed view ─────────────────────────────────────────────────────────────

/// Full Claude character: body + eyes, with per-frame transform and state colours.
struct ClaudeLogoView: View {
    let charState: CharacterState
    let rotation:  Double   // degrees
    let xOffset:   Double   // points
    let yOffset:   Double   // points
    let scale:     Double
    let glowRadius: Double

    private static let eyeColor = Color(red: 0.165, green: 0.047, blue: 0.016) // #2a0c04

    var body: some View {
        ZStack {
            ClaudeBodyShape()
                .fill(charState.bodyColor)

            ClaudeEyeShape(isLeft: true)
                .stroke(
                    Self.eyeColor,
                    style: StrokeStyle(lineWidth: charState.eyeLineWidth,
                                       lineCap: .round, lineJoin: .round)
                )
                .opacity(charState.eyeOpacity)

            ClaudeEyeShape(isLeft: false)
                .stroke(
                    Self.eyeColor,
                    style: StrokeStyle(lineWidth: charState.eyeLineWidth,
                                       lineCap: .round, lineJoin: .round)
                )
                .opacity(charState.eyeOpacity)
        }
        .frame(width: 18, height: 18)
        .rotationEffect(.degrees(rotation))
        .offset(x: xOffset, y: yOffset)
        .scaleEffect(scale)
        .shadow(color: charState.glowColor, radius: glowRadius)
        .frame(width: 22, height: 22)  // outer frame gives room for glow + offset
    }
}
