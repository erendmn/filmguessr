import Foundation
import Vision
import AppKit

// usage: faces <dir> -> JSON {filename: [[x,y,w,h], ...]} (normalized, origin top-left)
let dir = CommandLine.arguments[1]
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".jpg") }
var out: [String: [[Double]]] = [:]
for f in files {
    let url = URL(fileURLWithPath: dir + "/" + f)
    guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    try? handler.perform([req])
    out[f] = (req.results ?? []).map { r in
        let b = r.boundingBox
        return [Double(b.minX), Double(1 - b.maxY), Double(b.width), Double(b.height)]
    }
}
let data = try JSONSerialization.data(withJSONObject: out, options: [])
print(String(data: data, encoding: .utf8)!)
