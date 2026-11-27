"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Loader2,
  PhoneOff,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import AdminDecisionDialog from "@/features/admin/components/AdminDecisionDialog";
import ui from "@/features/admin/components/admin-ui.module.css";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";

export default function VideoKYCPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const zpRef = useRef<any>(null);
  const joinedRef = useRef(false);

  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);

  const [currentUser, setCurrentUser] = useState<any>(userData || null);

  useEffect(() => {
    axios
      .get("/api/me")
      .then((res) => {
        if (res.data) {
          setCurrentUser(res.data);
          dispatch(setUserData(res.data));
        }
      })
      .catch(() => {});
  }, [dispatch]);

  const roomId =
    typeof params?.roomId === "string"
      ? params.roomId
      : Array.isArray(params?.roomId)
      ? params.roomId[0]
      : null;

  const isAdmin = (currentUser || userData)?.role === "admin";

  const [joined, setJoined] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const previewDevices = useRef({ camera: true, mic: true });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [callError, setCallError] = useState("");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* ================= CAMERA PREVIEW ================= */


const handleApprove = async () => {
  try {
    setActionLoading(true);

    const res = await fetch("/api/admin/vendors/video-kyc/complete", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        action: "approve",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    zpRef.current?.destroy(); // auto end call
    router.push("/admin/dashboard");
  } catch (err: any) {
    alert(err.message);
  } finally {
    setActionLoading(false);
  }
};

const handleReject = async () => {
  if (!rejectReason.trim()) {
    alert("Rejection reason required");
    return;
  }

  try {
    setActionLoading(true);

    const res = await fetch("/api/admin/vendors/video-kyc/complete", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        action: "reject",
        reason: rejectReason,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    zpRef.current?.destroy();
    router.push("/admin/dashboard");
  } catch (err: any) {
    alert(err.message);
  } finally {
    setActionLoading(false);
  }
};

  useEffect(() => {
    if (joined) return;

    let localStream: MediaStream;
    let disposed = false;

    const init = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (disposed) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setPreviewError(false);
        setStream(localStream);
        localStream.getVideoTracks().forEach((track) => { track.enabled = previewDevices.current.camera; });
        localStream.getAudioTracks().forEach((track) => { track.enabled = previewDevices.current.mic; });
        if (previewRef.current) {
          previewRef.current.srcObject = localStream;
        }
      } catch {
        if (!disposed) setPreviewError(true);
      }
    };

    void init();

    return () => {
      disposed = true;
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [joined, previewAttempt]);

  const toggleCamera = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach(
      (track) => (track.enabled = !cameraOn)
    );
    previewDevices.current.camera = !cameraOn;
    setCameraOn(!cameraOn);
  };

  const toggleMic = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach(
      (track) => (track.enabled = !micOn)
    );
    previewDevices.current.mic = !micOn;
    setMicOn(!micOn);
  };

  /* Driver auto-detection: when admin approves or rejects during call */
  useEffect(() => {
    if (isAdmin || !joined) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get("/api/me");
        const me = res.data;
        if (me) {
          if (me.videoKycStatus === "approved") {
            clearInterval(interval);
            zpRef.current?.destroy();
            router.push("/partners/dashboard");
          } else if (me.videoKycStatus === "rejected") {
            clearInterval(interval);
            zpRef.current?.destroy();
            router.push("/partners/dashboard");
          }
        }
      } catch (err) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [isAdmin, joined, router]);

  /* ================= START CALL ================= */

  const startCall = async () => {
    if (!roomId || !containerRef.current) return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    setLoading(true);
    setCallError("");

    try {
      // Release camera preview tracks so Zego can acquire the webcam hardware
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      const tokenRes = await axios.post("/api/zego/token", { roomId });
      const { token, appID: serverAppID, userID, userName } = tokenRes.data;

      if (!token) {
        throw new Error("Unable to obtain secure video verification session token.");
      }

      const activeUserId =
        userID || (currentUser || userData)?._id?.toString() || `user-${Date.now()}`;
      const activeUserName =
        isAdmin
          ? "Admin"
          : userName || (currentUser || userData)?.name || "Vendor";

      const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        serverAppID || Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
        token,
        roomId,
        activeUserId,
        activeUserName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        turnOnCameraWhenJoining: cameraOn,
        turnOnMicrophoneWhenJoining: micOn,
        onUserJoin: (users: any[]) => {
          if (users && users.length > 0) {
            setRemoteJoined(true);
          }
        },
        onUserLeave: () => {
          setRemoteJoined(false);
        },
        onLeaveRoom: () => {
          if (isAdmin) {
            router.push("/admin/dashboard");
          } else {
            router.push("/partners/dashboard");
          }
        },
      });

      setJoined(true);
    } catch (err: any) {
      console.error(err);
      setCallError(err.message || "Couldn’t start the call. Try joining again.");
      setPreviewAttempt((attempt) => attempt + 1);
      joinedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    try {
      zpRef.current?.destroy();
    } catch (e) {}

    if (isAdmin) {
      router.push("/admin/dashboard");
    } else {
      router.push("/partners/dashboard");
    }
  };

  

 

  return (
    <div className={`${ui.shell} ${ui.kycShell}`}>
      <header className={ui.kycHeader}>
        <div className={ui.kycHeaderInner}>
          <div className={ui.brand}>
            <span className={ui.brandGlyph} lang="as" aria-hidden="true">য</span>
            <span className={ui.brandText}>Jaatri <small>Video verification</small></span>
          </div>
          {joined && (
            <div className={ui.kycToolbar} role="group" aria-label="Call actions">
              {isAdmin && (
                <>
                  <button type="button" className={ui.primary} onClick={() => setShowApproveModal(true)}>
                    <CheckCircle size={15} aria-hidden="true" />Approve
                  </button>
                  <button type="button" className={ui.button} onClick={() => setShowRejectModal(true)}>
                    <XCircle size={15} aria-hidden="true" />Reject
                  </button>
                </>
              )}
              <button type="button" className={ui.danger} onClick={handleEndCall}>
                <PhoneOff size={15} aria-hidden="true" />End call
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={ui.kycBody} aria-label="Video verification">
        <div className={ui.videoStage} data-joined={joined}>
          {joined && !remoteJoined && (
            <p className={ui.waitingLabel} role="status">
              <span className={ui.waitDot} aria-hidden="true" />
              Waiting for {isAdmin ? "the driver" : "the reviewer"} to connect…
            </p>
          )}
          <div ref={containerRef} className={ui.videoContainer} />
        </div>

        {!joined && (
          <div className={ui.preflight}>
            <section className={ui.preview} aria-label="Camera preview">
              <div className={ui.previewStage}>
                <video ref={previewRef} autoPlay muted playsInline aria-label="Your camera preview" />
                {(!cameraOn || !stream) && (
                  <p className={ui.previewOff}>
                    <VideoOff size={24} aria-hidden="true" />
                    {!cameraOn ? "Camera off" : previewError ? "Camera preview unavailable" : "Starting camera preview…"}
                  </p>
                )}
              </div>
              <div className={ui.previewLabel}><span>Your preview</span><span>Not in call</span></div>
            </section>

            <section className={`${ui.panel} ${ui.kycSetup}`} aria-labelledby="kyc-title">
              <p className={ui.eyebrow}>{isAdmin ? "Operations / verification" : "Partner / verification"}</p>
              <h1 id="kyc-title" className={ui.kycTitle}>Ready for verification?</h1>
              <p className={ui.secondary}>Check your camera and microphone before joining your one-to-one call.</p>
              {previewError && (
                <div className={ui.callNotice} role="status">
                  Check your browser camera and microphone permissions, then try the preview again.
                  <button type="button" className={`mt-2 ${ui.button}`} onClick={() => {
                    setPreviewError(false);
                    setPreviewAttempt((attempt) => attempt + 1);
                  }}>Retry preview</button>
                </div>
              )}
              <div className={ui.deviceControls} role="group" aria-label="Camera and microphone">
                <button type="button" className={`${ui.button} ${ui.deviceControl}`}
                  onClick={toggleCamera} aria-pressed={cameraOn} disabled={!stream || loading}>
                  <span>{cameraOn ? <Video size={16} aria-hidden="true" /> : <VideoOff size={16} aria-hidden="true" />}Camera</span>
                  <small>{stream ? cameraOn ? "On" : "Off" : "Unavailable"}</small>
                </button>
                <button type="button" className={`${ui.button} ${ui.deviceControl}`}
                  onClick={toggleMic} aria-pressed={micOn} disabled={!stream || loading}>
                  <span>{micOn ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}Microphone</span>
                  <small>{stream ? micOn ? "On" : "Off" : "Unavailable"}</small>
                </button>
              </div>
              {callError && <p role="alert" className={ui.callNotice}>{callError}</p>}
              <button type="button" onClick={startCall} disabled={loading || !roomId}
                className={`${ui.primary} ${ui.kycJoin}`}>
                {loading ? "Connecting…" : "Join verification call"}
                {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
              </button>
              <p className={`flex items-center gap-2 ${ui.secondary}`}>
                <ShieldCheck size={15} aria-hidden="true" /> Only join if you’re ready to speak.
              </p>
            </section>
          </div>
        )}
      </main>

      <AdminDecisionDialog open={showApproveModal} title="Approve video verification?"
        confirmLabel="Approve" loading={actionLoading} onClose={() => setShowApproveModal(false)} onConfirm={handleApprove}>
        <p className={ui.secondary}>Approve only after you finish reviewing the driver’s identity.</p>
      </AdminDecisionDialog>
      <AdminDecisionDialog open={showRejectModal} title="Reject video verification?"
        confirmLabel="Reject" loading={actionLoading} destructive confirmDisabled={!rejectReason.trim()}
        onClose={() => setShowRejectModal(false)} onConfirm={handleReject}>
        <label className={ui.secondary}>
          Rejection reason
          <textarea className={ui.field} value={rejectReason} onChange={(e) => setRejectReason(e.currentTarget.value)} rows={3} />
        </label>
      </AdminDecisionDialog>
    </div>
  );
}
