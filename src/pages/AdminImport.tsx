import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, CheckCircle, Brain, FileText, PlayCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

type DatasetType = 'medicines' | 'symptom_disease_matrix' | 'specialist_classification' | 'medicine_ner';

const DATASET_INFO: Record<DatasetType, { title: string; titleBn: string; desc: string; descBn: string }> = {
  medicines: {
    title: 'Medicine Database (DGDA)',
    titleBn: 'ওষুধ ডাটাবেজ (DGDA)',
    desc: 'Import DGDA medicine CSV with 21,000+ medicines. Columns: id, brand_name, medicine_type, slug, form, generic_name, strength, manufacturer, price_info, pack_info',
    descBn: 'DGDA ওষুধ CSV আমদানি (২১,০০০+ ওষুধ)। কলাম: id, brand_name, medicine_type, slug, form, generic_name, strength, manufacturer, price_info, pack_info',
  },
  symptom_disease_matrix: {
    title: 'Symptom-Disease Matrix',
    titleBn: 'লক্ষণ-রোগ ম্যাট্রিক্স',
    desc: 'Binary matrix CSV. First column = disease name, remaining columns = 0/1 for each symptom.',
    descBn: 'বাইনারি ম্যাট্রিক্স CSV। প্রথম কলাম = রোগের নাম, বাকি কলাম = প্রতিটি লক্ষণের জন্য ০/১।',
  },
  specialist_classification: {
    title: 'Specialist Classification',
    titleBn: 'বিশেষজ্ঞ শ্রেণীবিভাগ',
    desc: 'CSV with Patient ID, Gender, Problem, Specialist.',
    descBn: 'CSV: Patient ID, Gender, Problem, Specialist।',
  },
  medicine_ner: {
    title: 'Medicine NER Knowledge Base',
    titleBn: 'ওষুধ NER জ্ঞানভাণ্ডার',
    desc: 'Bengali medical NER dataset.',
    descBn: 'বাংলা মেডিকেল NER ডেটাসেট।',
  },
};

export default function AdminImport() {
  const { lang } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [activeTab, setActiveTab] = useState<DatasetType>('medicines');

  const handleImport = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setProgressText('');
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());

      if (activeTab === 'medicines') {
        await importMedicines(lines);
      } else if (activeTab === 'symptom_disease_matrix') {
        await importSymptomDiseaseMatrix(lines);
      } else if (activeTab === 'specialist_classification') {
        await importSpecialistClassification(lines);
      } else if (activeTab === 'medicine_ner') {
        await importMedicineNer(lines);
      }
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      setProgressText('');
    }
  };

  const importMedicines = async (lines: string[]) => {
    // Parse all lines into medicine objects
    const medicines = lines.map(line => {
      const cols = parseCSVLine(line);
      return {
        brand_name: cols[1] || 'Unknown',
        medicine_type: cols[2] || 'allopathic',
        slug: cols[3] || null,
        form: cols[4] || null,
        generic_name: cols[5] || null,
        strength: cols[6] || null,
        manufacturer: cols[7] || null,
        price_info: cols[8] || null,
        pack_info: cols[9] || null,
      };
    }).filter(m => m.brand_name && m.brand_name !== 'Unknown');

    const chunkSize = 500;
    let totalInserted = 0, totalErrors = 0;
    const totalChunks = Math.ceil(medicines.length / chunkSize);

    for (let i = 0; i < medicines.length; i += chunkSize) {
      const chunkIndex = Math.floor(i / chunkSize);
      const chunk = medicines.slice(i, i + chunkSize);
      setProgressText(`Batch ${chunkIndex + 1}/${totalChunks} (${i + chunk.length}/${medicines.length} records)`);
      
      const { data, error } = await supabase.functions.invoke('medicine-import', {
        body: { medicines: chunk, clear_existing: i === 0 },
      });
      if (error) totalErrors += chunk.length;
      else { totalInserted += data?.inserted || 0; totalErrors += data?.errors || 0; }
      setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    }
    finishImport(totalInserted, totalErrors);
  };

  const importSymptomDiseaseMatrix = async (lines: string[]) => {
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    const rows = lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      return { disease: cols[0], values: cols.slice(1).map(v => parseInt(v) || 0) };
    }).filter(r => r.disease);

    const chunkSize = 100;
    let totalInserted = 0, totalErrors = 0;
    const totalChunks = Math.ceil(rows.length / chunkSize);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { data, error } = await supabase.functions.invoke('dataset-import', {
        body: { dataset_type: 'symptom_disease_matrix', data: { headers, rows: chunk }, clear_existing: i === 0 },
      });
      if (error) totalErrors += chunk.length;
      else { totalInserted += data?.inserted || 0; totalErrors += data?.errors || 0; }
      setProgress(Math.round(((Math.floor(i / chunkSize) + 1) / totalChunks) * 100));
    }
    finishImport(totalInserted, totalErrors);
  };

  const importSpecialistClassification = async (lines: string[]) => {
    const rows = lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      return { gender: cols[1], problem: cols[2], specialist: cols[3] };
    }).filter(r => r.problem && r.specialist);

    const { data, error } = await supabase.functions.invoke('dataset-import', {
      body: { dataset_type: 'specialist_classification', data: rows, clear_existing: true },
    });
    setProgress(100);
    if (error) finishImport(0, rows.length);
    else finishImport(data?.inserted || 0, data?.errors || 0);
  };

  const importMedicineNer = async (lines: string[]) => {
    const rows = lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      return {
        medical_text: cols[0],
        medicine_name: cols[1] || null,
        organ: cols[2] || null,
        disease: cols[3] || null,
        hormone: cols[4] || null,
        pharmacological_class: cols[5] || null,
        common_medical_terms: cols[6] || null,
      };
    }).filter(r => r.medical_text);

    const chunkSize = 500;
    let totalInserted = 0, totalErrors = 0;
    const totalChunks = Math.ceil(rows.length / chunkSize);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { data, error } = await supabase.functions.invoke('dataset-import', {
        body: { dataset_type: 'medicine_ner', data: chunk, clear_existing: i === 0 },
      });
      if (error) totalErrors += chunk.length;
      else { totalInserted += data?.inserted || 0; totalErrors += data?.errors || 0; }
      setProgress(Math.round(((Math.floor(i / chunkSize) + 1) / totalChunks) * 100));
    }
    finishImport(totalInserted, totalErrors);
  };

  const handleImportBundledMedicines = useCallback(async () => {
    setImporting(true);
    setProgress(0);
    setProgressText('Loading bundled medicine CSV...');
    setResult(null);
    setActiveTab('medicines');

    try {
      // Fetch the bundled CSV from the public data
      const response = await fetch('/src/data/medicine.csv');
      if (!response.ok) throw new Error('Could not load bundled medicine CSV');
      const text = await response.text();
      const lines = text.split('\n').filter(l => l.trim());
      setProgressText(`Found ${lines.length} medicines. Starting import...`);
      await importMedicines(lines);
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      setProgressText('');
    }
  }, []);

  const finishImport = (inserted: number, errors: number) => {
    setResult({ inserted, errors });
    toast({
      title: lang === 'bn' ? 'আমদানি সম্পন্ন!' : 'Import Complete!',
      description: `${inserted} records imported${errors > 0 ? `, ${errors} errors` : ''}`,
    });
  };

  if (role !== 'healthcare_professional') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground font-bangla">
          {lang === 'bn' ? 'শুধুমাত্র স্বাস্থ্যকর্মীদের জন্য প্রবেশযোগ্য' : 'Only accessible to healthcare professionals'}
        </p>
      </div>
    );
  }

  const info = DATASET_INFO[activeTab];

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold font-bangla mb-6 flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'ডেটা আমদানি ও ML সেটআপ' : 'Data Import & ML Setup'}
      </h1>

      {/* Quick Import: Bundled Medicine CSV */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm font-bangla">
                {lang === 'bn' ? '⚡ দ্রুত আমদানি: সম্পূর্ণ DGDA ওষুধ ডাটাবেজ (২১,০০০+ ওষুধ)' : '⚡ Quick Import: Full DGDA Medicine Database (21,000+ medicines)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'bn' ? 'একটি ক্লিকে সমস্ত ওষুধ আমদানি করুন' : 'Import all medicines in one click from bundled CSV'}
              </p>
            </div>
            <Button
              onClick={handleImportBundledMedicines}
              disabled={importing}
              className="gap-2 shrink-0"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {lang === 'bn' ? 'আমদানি শুরু' : 'Import Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as DatasetType); setResult(null); }}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-4">
          <TabsTrigger value="medicines" className="text-xs">
            {lang === 'bn' ? 'ওষুধ' : 'Medicines'}
          </TabsTrigger>
          <TabsTrigger value="symptom_disease_matrix" className="text-xs">
            {lang === 'bn' ? 'লক্ষণ ম্যাট্রিক্স' : 'Symptom Matrix'}
          </TabsTrigger>
          <TabsTrigger value="specialist_classification" className="text-xs">
            {lang === 'bn' ? 'বিশেষজ্ঞ' : 'Specialist'}
          </TabsTrigger>
          <TabsTrigger value="medicine_ner" className="text-xs">
            {lang === 'bn' ? 'NER ডেটা' : 'NER Data'}
          </TabsTrigger>
        </TabsList>

        {(['medicines', 'symptom_disease_matrix', 'specialist_classification', 'medicine_ner'] as DatasetType[]).map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="font-bangla text-base flex items-center gap-2">
                  {tab.includes('matrix') || tab.includes('specialist') ? <Brain className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {lang === 'bn' ? info.titleBn : info.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-bangla">
                  {lang === 'bn' ? info.descBn : info.desc}
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                />

                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                  className="w-full font-bangla gap-2"
                  size="lg"
                >
                  {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {importing
                    ? (lang === 'bn' ? 'আমদানি হচ্ছে...' : 'Importing...')
                    : (lang === 'bn' ? 'CSV ফাইল নির্বাচন করুন' : 'Select CSV File')}
                </Button>

                {importing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground text-center">
                      {progress}% {progressText && `— ${progressText}`}
                    </p>
                  </div>
                )}

                {result && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm font-bangla">
                        {lang === 'bn' ? 'আমদানি সম্পন্ন' : 'Import Complete'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.inserted} {lang === 'bn' ? 'রেকর্ড সফলভাবে যোগ হয়েছে' : 'records imported successfully'}
                        {result.errors > 0 && ` (${result.errors} ${lang === 'bn' ? 'ত্রুটি' : 'errors'})`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ML Training Guide */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-bangla text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {lang === 'bn' ? 'ML মডেল ট্রেনিং গাইড' : 'ML Model Training Guide'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="font-semibold text-foreground">1. XGBoost Classifier (Symptom → Disease)</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

df = pd.read_csv('symptom_disease_matrix.csv')
X = df.iloc[:, 1:]
y = df.iloc[:, 0]
le = LabelEncoder()
y_encoded = le.fit_transform(y)
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2)
model = XGBClassifier(n_estimators=200, max_depth=6)
model.fit(X_train, y_train)
joblib.dump(model, 'xgboost_triage.joblib')`}</pre>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="font-semibold text-foreground">2. BanglaBERT NER (Medicine-Disease-Organ Detection)</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`from transformers import AutoTokenizer, AutoModelForTokenClassification, Trainer
model_name = "sagorsarker/bangla-bert-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
label_list = ["O", "B-MED", "I-MED", "B-ORG", "I-ORG", "B-DIS", "I-DIS"]
model = AutoModelForTokenClassification.from_pretrained(model_name, num_labels=len(label_list))
# Fine-tune on MedER_Dataset_Bengali CSV
trainer = Trainer(model=model, ...)
trainer.train()`}</pre>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="font-semibold text-foreground">
              {lang === 'bn' ? 'আপনার অ্যাপে মডেল সংযুক্ত করুন' : 'Connect Models to Your App'}
            </p>
            <p>Host your trained model via FastAPI/Hugging Face, then add the endpoint URL as a backend secret. The triage engine will call your model API for predictions.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
