// swift-app/ClaudeNotifier/CharacterState.swift
import SwiftUI

/// Maps state.json "status" values to visual properties.
enum CharacterState: String {
    case idle
    case pendingLow    = "pending_low"
    case pendingMedium = "pending_medium"
    case pendingHigh   = "pending_high"
    case celebrating

    static let all: [CharacterState] = [.idle, .pendingLow, .pendingMedium, .pendingHigh, .celebrating]

    /// Body fill colour — matches SVG CSS per state.
    var bodyColor: Color {
        switch self {
        case .idle:          return Color(red: 0.851, green: 0.467, blue: 0.341) // #D97757
        case .pendingLow:    return Color(red: 0.831, green: 0.510, blue: 0.180) // #d4822e
        case .pendingMedium: return Color(red: 0.753, green: 0.314, blue: 0.188) // #c05030
        case .pendingHigh:   return Color(red: 0.667, green: 0.165, blue: 0.094) // #aa2a18
        case .celebrating:   return Color(red: 0.227, green: 0.620, blue: 0.416) // #3a9e6a
        }
    }

    /// Eye opacity — idle eyes are dim; alert states are full brightness.
    var eyeOpacity: Double {
        switch self {
        case .idle:       return 0.25
        case .celebrating: return 0.7
        default:          return 1.0
        }
    }

    /// Eye stroke width — pendingHigh uses a slightly thicker stroke.
    var eyeLineWidth: CGFloat {
        self == .pendingHigh ? 1.3 : 1.0
    }

    /// Drop shadow glow colour for pendingHigh and celebrating states.
    var glowColor: Color {
        switch self {
        case .pendingHigh:  return Color(red: 0.78, green: 0.20, blue: 0.20)
        case .celebrating:  return Color(red: 0.23, green: 0.62, blue: 0.42)
        default:            return .clear
        }
    }
}
