import { LookingGlassConfig } from "./LookingGlassConfig"

export function LookingGlassMediaController(appCanvas: HTMLCanvasElement, cfg: LookingGlassConfig) {
	const mediaSource = new MediaSource()
	mediaSource.addEventListener("sourceopen", handleSourceOpen, false)
	let mediaRecorder
	let recordedBlobs
	let sourceBuffer
	let stream

	const video = document.getElementById("looking-glass-video")

	const recordButton = document.getElementById("recordbutton")
	const downloadButton = document.getElementById("downloadbutton")
	const screenshotbutton = document.getElementById("screenshotbutton")
	recordButton.onclick = toggleRecording
	downloadButton.onclick = downloadVideo
	screenshotbutton.onclick = downloadImage

	function handleSourceOpen(event) {
		console.log("MediaSource opened")
		sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="h264"')
		console.log("Source buffer: ", sourceBuffer)
	}

	function handleDataAvailable(event) {
		if (event.data && event.data.size > 0) {
			recordedBlobs.push(event.data)
		}
	}

	function handleStop(event) {
		console.log("Recorder stopped: ", event)
		const superBuffer = new Blob(recordedBlobs, { type: "video/webm" })
		video.src = window.URL.createObjectURL(superBuffer)
	}

	function toggleRecording() {
		if (stream == null) {
			stream = appCanvas.captureStream() // frames per second
			console.log("Started stream capture from canvas element: ", stream)
		}
		// if stream exists, stop it
		else {
			stream = null // frames per second
			console.log("theoretically set stream to null and stop capture", stream)
		}

		if (recordButton.textContent === "Record") {
			// set capturing to true before recording starts
			cfg.capturing = true
			// in order to record a quilt video the inline view must be set to quilt
			if (cfg.inlineView != 2) {
				cfg.inlineView = 2
			}
			startRecording()
		} else {
			stopRecording()
			cfg.capturing = false
			recordButton.textContent = "Record"
			downloadButton.disabled = false
		}
	}

	// The nested try blocks will be simplified when Chrome 47 moves to Stable
	function startRecording() {
		let options = { mimeType: "video/webm" }
		recordedBlobs = []
		try {
			mediaRecorder = new MediaRecorder(stream, options)
		} catch (e0) {
			console.log("Unable to create MediaRecorder with options Object: ", e0)
			try {
				options = { mimeType: "video/webm,codecs=h264" }
				mediaRecorder = new MediaRecorder(stream, options)
			} catch (e1) {
				console.log("Unable to create MediaRecorder with options Object: ", e1)
				try {
					options = { mimeType: "video/h264" } // Chrome 47
					mediaRecorder = new MediaRecorder(stream, options)
				} catch (e2) {
					alert(
						"MediaRecorder is not supported by this browser.\n\n" +
							"Try Firefox 29 or later, or Chrome 47 or later, " +
							"with Enable experimental Web Platform features enabled from chrome://flags."
					)
					console.error("Exception while creating MediaRecorder:", e2)
					return
				}
			}
		}
		console.log("Created MediaRecorder", mediaRecorder, "with options", options)
		recordButton.textContent = "Stop Recording"
		downloadButton.disabled = true
		mediaRecorder.onstop = handleStop
		mediaRecorder.ondataavailable = handleDataAvailable
		mediaRecorder.start(100) // collect 100ms of data
		console.log("MediaRecorder started", mediaRecorder)
	}

	function stopRecording() {
		mediaRecorder.stop()
		console.log("Recorded Blobs: ", recordedBlobs)
		video.controls = true
	}

	function downloadVideo() {
		const blob = new Blob(recordedBlobs, { type: "video/webm" })
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.style.display = "none"
		a.href = url
		a.download = `hologram_qs${cfg.quiltWidth}x${cfg.quiltHeight}a${cfg.aspect}.webm`
		document.body.appendChild(a)
		a.click()
		setTimeout(() => {
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)
		}, 100)
	}

	function downloadImage(appCanvas: HTMLCanvasElement, cfg: LookingGlassConfig) {
		// capturing must be set to true before downloading an image in order to capture a high quality quilt. TODO: manually grab XRsession framebuffer instead
		const new_canvas = new HTMLCanvasElement()
		const gl = new_canvas.getContext("webgl2")
		const app = appCanvas.getContext("webgl2")
		// Create a framebuffer backed by the texture
		if (gl && app) {
			var framebuffer = gl.createFramebuffer()
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, app.getParameter(gl.ACTIVE_TEXTURE), 0)

			// Read the contents of the framebuffer
			var data = new Uint8Array(cfg.framebufferWidth * cfg.framebufferHeight * 4)
			gl.readPixels(0, 0, cfg.framebufferWidth, cfg.framebufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data)

			gl.deleteFramebuffer(framebuffer)

			// Create a 2D canvas to store the result
			var canvas = document.createElement("canvas")
			canvas.width = cfg.framebufferWidth
			canvas.height = cfg.framebufferHeight
			var context = canvas.getContext("2d")

			// Copy the pixels to a 2D canvas
			if (context) {
				var imageData = context.createImageData(cfg.framebufferWidth, cfg.framebufferHeight)
				imageData.data.set(data)
				context.putImageData(imageData, 0, 0)
			}

			let url = canvas.toDataURL()
			const a = document.createElement("a")
			a.style.display = "none"
			a.href = url
      a.download = `hologram_qs${cfg.quiltWidth}x${cfg.quiltHeight}a${cfg.aspect}.png`;
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)
		}
	}
}
