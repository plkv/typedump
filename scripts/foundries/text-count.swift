// Measures the type macOS Vision can read in each image. Reads image URLs from
// stdin, one per line, and prints one JSON line per image:
//   {"src": "...", "line": 0.31, "area": 0.12}
// line is the tallest line of text as a share of the image height, area the
// share of the image the text covers; both -1 when the image would not load.
// Used by index.mjs to drop pictures with no type in them. Size matters more
// than letter count: a single huge "Barr" is a specimen, a shop sign in the
// back of a photo is not.
import Foundation
import Vision

var urls: [String] = []
while let line = readLine() { if !line.isEmpty { urls.append(line) } }
let lock = NSLock()

DispatchQueue.concurrentPerform(iterations: urls.count) { i in
    let src = urls[i]
    var line = -1.0, area = -1.0
    if let url = URL(string: src), let data = try? Data(contentsOf: url) {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        if (try? VNImageRequestHandler(data: data).perform([request])) != nil {
            let boxes = (request.results ?? [])
                .filter { ($0.topCandidates(1).first?.confidence ?? 0) >= 0.4 }
                .map { $0.boundingBox }
            line = boxes.map { Double($0.height) }.max() ?? 0
            area = boxes.reduce(0) { $0 + Double($1.width * $1.height) }
        }
    }
    let json = try! JSONSerialization.data(withJSONObject: ["src": src, "line": line, "area": area])
    lock.lock()
    print(String(data: json, encoding: .utf8)!)
    fflush(stdout)
    lock.unlock()
}
