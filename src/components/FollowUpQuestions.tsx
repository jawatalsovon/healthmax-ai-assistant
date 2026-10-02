import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FollowUpAnswer, FollowUpQuestion } from '@/types/triage';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  questions: FollowUpQuestion[];
  lang: 'bn' | 'en';
  onSubmitAnswers: (answers: FollowUpAnswer[]) => void;
  disabled?: boolean;
}

export function FollowUpQuestions({ questions, lang, onSubmitAnswers, disabled }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  if (submitted) return null;

  const handleSubmit = () => {
    const payload: FollowUpAnswer[] = questions.map((q, i) => ({
      question_id: q.id || `q_${i + 1}`,
      question_en: q.question_en,
      question_bn: q.question_bn,
      answer: answers[i] || 'Not answered',
    }));
    setSubmitted(true);
    onSubmitAnswers(payload);
  };

  const startVoice = (index: number) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      setAnswers(p => ({ ...p, [index]: (p[index] || '') + (p[index] ? ' ' : '') + text }));
    };
    recognition.onend = () => setRecordingIndex(null);
    recognition.onerror = () => setRecordingIndex(null);
    recognition.start();
    setRecordingIndex(index);
    recognitionRef.current = recognition;
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setRecordingIndex(null);
  };

  const allAnswered = questions.every((_, i) => (answers[i] || '').trim().length > 0);

  return (
    <Card className="bg-secondary/50 border-0">
      <CardContent className="pt-4 pb-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {lang === 'bn' ? 'অনুসরণমূলক প্রশ্ন' : 'Follow-up Questions'}
        </p>
        {questions.map((q, i) => (
          <div key={q.id || i} className="space-y-2">
            <p className="font-bangla text-sm font-medium">
              {i + 1}. {lang === 'bn' ? q.question_bn : q.question_en}
            </p>
            {q.type === 'yes_no' ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={answers[i] === (lang === 'bn' ? 'হ্যাঁ' : 'Yes') ? 'default' : 'outline'}
                  onClick={() => setAnswers(p => ({ ...p, [i]: lang === 'bn' ? 'হ্যাঁ' : 'Yes' }))}
                  disabled={disabled}
                  className="font-bangla"
                >
                  {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
                </Button>
                <Button
                  size="sm"
                  variant={answers[i] === (lang === 'bn' ? 'না' : 'No') ? 'default' : 'outline'}
                  onClick={() => setAnswers(p => ({ ...p, [i]: lang === 'bn' ? 'না' : 'No' }))}
                  disabled={disabled}
                  className="font-bangla"
                >
                  {lang === 'bn' ? 'না' : 'No'}
                </Button>
              </div>
            ) : q.type === 'choice' && q.options_en ? (
              <div className="flex flex-wrap gap-2">
                {(lang === 'bn' ? q.options_bn || q.options_en : q.options_en).map((opt, j) => (
                  <Button
                    key={j}
                    size="sm"
                    variant={answers[i] === opt ? 'default' : 'outline'}
                    onClick={() => setAnswers(p => ({ ...p, [i]: opt }))}
                    disabled={disabled}
                    className="font-bangla"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={answers[i] || ''}
                  onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                  placeholder={lang === 'bn' ? 'আপনার উত্তর লিখুন বা বলুন...' : 'Type or speak your answer...'}
                  className="font-bangla text-sm"
                  disabled={disabled}
                />
                <Button
                  size="icon"
                  variant={recordingIndex === i ? 'destructive' : 'outline'}
                  onClick={recordingIndex === i ? stopVoice : () => startVoice(i)}
                  disabled={disabled || (recordingIndex !== null && recordingIndex !== i)}
                  className="shrink-0 h-9 w-9"
                >
                  {recordingIndex === i ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={disabled || !allAnswered} size="sm" className="w-full font-bangla">
          {lang === 'bn' ? 'উত্তর জমা দিন' : 'Submit Answers'}
        </Button>
      </CardContent>
    </Card>
  );
}
