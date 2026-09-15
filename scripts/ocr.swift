import Foundation
import Vision
import AppKit

// usage: swift ocr.swift <dir>  -> prints JSON {filename: "recognized text"}
let dir = CommandLine.arguments[1]
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".jpg") }
var out: [String: String] = [:]
for f in files {
    let url = URL(fileURLWithPath: dir + "/" + f)
    guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = ["tr-TR", "en-US"]
    req.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    try? handler.perform([req])
    let texts = (req.results ?? []).compactMap { r -> String? in
        guard let c = r.topCandidates(1).first, c.confidence > 0.0 else { return nil }
        // box height relative to image: big text is suspicious
        let h = r.boundingBox.height
        return "\(c.string)|\(String(format: "%.3f", h))"
    }
    out[f] = texts.joined(separator: "\n")
}
let data = try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted])
print(String(data: data, encoding: .utf8)!)
