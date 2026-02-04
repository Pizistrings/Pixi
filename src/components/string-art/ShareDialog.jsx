import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Mic, Square, Play, Pause, Download, Share2, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ShareDialog({ open, onOpenChange, project, onUpdate }) {
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const shareUrl = project?.share_token 
    ? `${window.location.origin}/shared/${project.share_token}`
    : '';

  const patternUrl = project?.result_image_url || '';

  useEffect(() => {
    if (project?.voice_note_url && !audioBlob) {
      fetch(project.voice_note_url)
        .then(res => res.blob())
        .then(blob => setAudioBlob(blob))
        .catch(console.error);
    }
  }, [project?.voice_note_url]);

  const generateShareToken = async () => {
    if (!project) return;
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await onUpdate({
      is_public: true,
      share_token: token
    });
  };

  const togglePublic = async () => {
    if (!project) return;
    
    if (!project.is_public && !project.share_token) {
      await generateShareToken();
    } else {
      await onUpdate({
        is_public: !project.is_public
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 10) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioBlob && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const saveVoiceNote = async () => {
    if (!audioBlob || !project) return;
    
    setIsUploading(true);
    try {
      const file = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await onUpdate({
        voice_note_url: file_url,
        voice_note_duration: recordingTime
      });
    } catch (error) {
      console.error('Error uploading voice note:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = 'string-art-qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-500" />
                <div>
                  <Label className="font-medium">Make Public</Label>
                  <p className="text-xs text-gray-500">Anyone with the link can view</p>
                </div>
              </div>
              <Switch
                checked={project?.is_public || false}
                onCheckedChange={togglePublic}
              />
            </div>
          </Card>

          {project?.is_public && shareUrl && (
            <>
              {/* Share Link */}
              <Card className="p-4">
                <Label className="text-sm mb-2 block">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>

              {/* QR Code for Pattern */}
              {patternUrl && (
                <Card className="p-4">
                  <Label className="text-sm mb-3 block">QR Code for Pattern Download</Label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <QRCodeSVG
                        id="qr-code-svg"
                        value={patternUrl}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadQRCode}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                </Card>
              )}

              {/* Voice Note */}
              <Card className="p-4">
                <Label className="text-sm mb-3 block">Voice Note (1-10 seconds)</Label>
                <div className="space-y-3">
                  {!audioBlob ? (
                    <div className="flex gap-2">
                      <Button
                        variant={isRecording ? "destructive" : "default"}
                        onClick={isRecording ? stopRecording : startRecording}
                        className="flex-1"
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Stop Recording ({recordingTime}s)
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <audio
                        ref={audioRef}
                        src={URL.createObjectURL(audioBlob)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={isPlaying ? pauseAudio : playAudio}
                          className="flex-1"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Play ({recordingTime}s)
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAudioBlob(null);
                            setRecordingTime(0);
                            setIsPlaying(false);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {!project?.voice_note_url && (
                        <Button
                          onClick={saveVoiceNote}
                          disabled={isUploading}
                          className="w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
                        >
                          {isUploading ? 'Saving...' : 'Save Voice Note'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}