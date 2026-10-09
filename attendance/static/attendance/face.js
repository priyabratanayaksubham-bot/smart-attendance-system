const FaceApp = (() => {

    const MODEL_URL =
        "https://justadudewhohacks.github.io/face-api.js/models";

    let stream = null;
    let modelsLoaded = false;

    async function loadModels() {

        if (modelsLoaded) {
            return;
        }

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        modelsLoaded = true;
        console.log("Face models loaded successfully.");
    }

    async function startCamera(video) {

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            throw new Error(
                "Your browser does not support camera access."
            );
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        console.log("Camera started successfully.");
    }

    async function getDescriptor(video) {

        if (!modelsLoaded) {
            await loadModels();
        }

        const result =
            await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 320,
                        scoreThreshold: 0.5
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

        return result;
    }

    function setStatus(element, message, success = false) {

        element.textContent = message;

        if (success) {
            element.style.color = "#34d399";
        } else {
            element.style.color = "";
        }
    }

    async function registerMode() {

        const video =
            document.getElementById("video");

        const start =
            document.getElementById("startCamera");

        const capture =
            document.getElementById("capture");

        const hidden =
            document.getElementById("descriptor");

        const save =
            document.getElementById("saveBtn");

        const status =
            document.getElementById("captureStatus");


        // -------------------------------
        // START CAMERA
        // -------------------------------

        start.onclick = async function () {

            try {

                setStatus(
                    status,
                    "Starting camera..."
                );

                await startCamera(video);

                start.disabled = true;
                capture.disabled = false;

                setStatus(
                    status,
                    "Camera ready. Look directly at the camera."
                );

                // Load models in background
                try {

                    await loadModels();

                    setStatus(
                        status,
                        "Camera ready. Look directly at the camera and click Capture Face."
                    );

                } catch (error) {

                    console.error(
                        "MODEL ERROR:",
                        error
                    );

                    setStatus(
                        status,
                        "Camera works, but face models could not load. Check your internet connection."
                    );

                    capture.disabled = true;
                }

            } catch (error) {

                console.error(
                    "CAMERA ERROR:",
                    error
                );

                setStatus(
                    status,
                    "Camera error: " +
                    error.name +
                    " - " +
                    error.message
                );
            }
        };


        // -------------------------------
        // CAPTURE FACE
        // -------------------------------

        capture.onclick = async function () {

            capture.disabled = true;

            setStatus(
                status,
                "Detecting your face..."
            );

            try {

                const result =
                    await getDescriptor(video);

                if (!result) {

                    setStatus(
                        status,
                        "No face detected. Look directly at the camera and try again."
                    );

                    capture.disabled = false;

                    return;
                }

                const descriptor =
                    Array.from(
                        result.descriptor
                    );

                console.log(
                    "Face descriptor length:",
                    descriptor.length
                );


                // Save descriptor in hidden input
                hidden.value =
                    JSON.stringify(descriptor);


                // Enable registration
                save.disabled = false;

                setStatus(
                    status,
                    "Face captured successfully ✓ You can now register the student.",
                    true
                );

                capture.textContent =
                    "Face Captured ✓";


            } catch (error) {

                console.error(
                    "FACE CAPTURE ERROR:",
                    error
                );

                setStatus(
                    status,
                    "Face capture failed: " +
                    error.message
                );

                capture.disabled = false;
            }
        };
    }


    // -------------------------------
    // ATTENDANCE MODE
    // -------------------------------

    async function attendanceMode() {

        const video =
            document.getElementById("video");

        const start =
            document.getElementById("startCamera");

        const scan =
            document.getElementById("scan");

        const title =
            document.getElementById("resultTitle");

        const text =
            document.getElementById("resultText");

        const confidence =
            document.getElementById("confidence");


        start.onclick = async function () {

            try {

                await startCamera(video);

                start.disabled = true;
                scan.disabled = false;

                title.textContent =
                    "Camera ready";

                text.textContent =
                    "Look directly at the camera and click Scan Face.";

            } catch (error) {

                console.error(
                    "CAMERA ERROR:",
                    error
                );

                text.textContent =
                    "Camera error: " +
                    error.message;
            }
        };


        scan.onclick = async function () {

            scan.disabled = true;

            title.textContent =
                "Scanning...";

            text.textContent =
                "Detecting your face...";

            confidence.textContent =
                "—";


            try {

                await loadModels();

                const result =
                    await getDescriptor(video);


                if (!result) {

                    title.textContent =
                        "No face detected";

                    text.textContent =
                        "Make sure your face is clearly visible.";

                    scan.disabled = false;

                    return;
                }


                const descriptor =
                    Array.from(
                        result.descriptor
                    );


                text.textContent =
                    "Face detected. Checking attendance...";


                const response =
                    await fetch(
                        "/api/attendance/",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "X-CSRFToken":
                                    getCookie(
                                        "csrftoken"
                                    )
                            },

                            body: JSON.stringify({
                                descriptor:
                                    descriptor
                            })
                        }
                    );


                const data =
                    await response.json();


                if (data.success) {

                    title.textContent =
                        "Attendance Marked ✓";

                    text.textContent =
                        `${data.student} (${data.roll_number}) is present today.`;

                    confidence.textContent =
                        data.confidence + "%";

                } else {

                    title.textContent =
                        data.duplicate
                            ? "Already Marked"
                            : "Face Not Recognized";

                    text.textContent =
                        data.message ||
                        data.error ||
                        "No matching student found.";

                    if (data.distance !== undefined && data.distance !== null) {
                        text.textContent +=
                            ` (distance: ${data.distance}; limit: ${data.threshold ?? 0.60}).`;
                    }

                    confidence.textContent =
                        data.confidence !== undefined && data.confidence !== null
                            ? data.confidence + "%"
                            : "—";
                }


            } catch (error) {

                console.error(
                    "ATTENDANCE ERROR:",
                    error
                );

                title.textContent =
                    "Recognition failed";

                text.textContent =
                    error.message;

            } finally {

                scan.disabled = false;
            }
        };
    }


    function getCookie(name) {

        const cookies =
            document.cookie.split(";");

        for (let cookie of cookies) {

            cookie = cookie.trim();

            if (
                cookie.startsWith(
                    name + "="
                )
            ) {

                return decodeURIComponent(
                    cookie.substring(
                        name.length + 1
                    )
                );
            }
        }

        return "";
    }


    return {
        registerMode,
        attendanceMode
    };

})();