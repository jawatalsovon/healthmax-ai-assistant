import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, CheckCircle, Brain, FileText } from 'lucide-react';
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
    desc: 'Import DGDA medicine CSV. Columns: id, brand_name, medicine_type, slug, form, generic_name, strength, manufacturer, price_info, pack_info',
    descBn: 'DGDA ওষুধ CSV আমদানি। কলাম: id, brand_name, medicine_type, slug, form, generic_name, strength, manufacturer, price_info, pack_info',
  },
  symptom_disease_matrix: {
    title: 'Symptom-Disease Matrix',
    titleBn: 'লক্ষণ-রোগ ম্যাট্রিক্স',
    desc: 'Binary matrix CSV. First column = disease name, remaining columns = 0/1 for each symptom. Used for ML classification.',
    descBn: 'বাইনারি ম্যাট্রিক্স CSV। প্রথম কলাম = রোগের নাম, বাকি কলাম = প্রতিটি লক্ষণের জন্য ০/১।',
  },
  specialist_classification: {
    title: 'Specialist Classification',
    titleBn: 'বিশেষজ্ঞ শ্রেণীবিভাগ',
    desc: 'CSV with Patient ID, Gender, Problem, Specialist. Maps patient complaints to specialist types.',
    descBn: 'CSV: Patient ID, Gender, Problem, Specialist। রোগীর সমস্যা থেকে বিশেষজ্ঞ নির্ধারণ।',
  },
  medicine_ner: {
    title: 'Medicine NER Knowledge Base',
    titleBn: 'ওষুধ NER জ্ঞানভাণ্ডার',
    desc: 'Bengali medical NER dataset. Columns: Medical Text, Medicine Name, Organ, Disease, Hormone, Pharmacological Class, Common Terms',
    descBn: 'বাংলা মেডিকেল NER ডেটাসেট। কলাম: মেডিকেল টেক্সট, ওষুধ, অঙ্গ, রোগ, হরমোন, ফার্মাকোলজিক্যাল ক্লাস',
  },
};

export default function AdminImport() {
  const { lang } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [activeTab, setActiveTab] = useState<DatasetType>('medicines');

  const handleImport = async (file: File) => {
    setImporting(true);
    setProgress(0);
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
    }
  };

  const importMedicines = async (lines: string[]) => {
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
      const chunk = medicines.slice(i, i + chunkSize);
      const { data, error } = await supabase.functions.invoke('medicine-import', {
        body: { medicines: chunk, clear_existing: i === 0 },
      });
      if (error) totalErrors += chunk.length;
      else { totalInserted += data?.inserted || 0; totalErrors += data?.errors || 0; }
      setProgress(Math.round(((Math.floor(i / chunkSize) + 1) / totalChunks) * 100));
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
        body: {
          dataset_type: 'symptom_disease_matrix',
          data: { headers, rows: chunk },
          clear_existing: i === 0,
        },
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
                    <p className="text-xs text-muted-foreground text-center">{progress}%</p>
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
            <p className="font-semibold text-foreground">{lang === 'bn' ? '১. XGBoost ক্লাসিফায়ার (লক্ষণ → রোগ)' : '1. XGBoost Classifier (Symptom → Disease)'}</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`# Python training script
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

# Load the symptom-disease matrix
df = pd.read_csv('symptom_disease_matrix.csv')
X = df.iloc[:, 1:]  # Binary symptom columns
y = df.iloc[:, 0]   # Disease names

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Train
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2)
model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1)
model.fit(X_train, y_train)
print(f"Accuracy: {model.score(X_test, y_test):.2f}")

# Save
joblib.dump(model, 'xgboost_triage.joblib')
joblib.dump(le, 'label_encoder.joblib')
# Save column names for inference
pd.Series(X.columns.tolist()).to_json('symptom_columns.json')`}</pre>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="font-semibold text-foreground">{lang === 'bn' ? '২. BanglaBERT NER (ওষুধ-রোগ-অঙ্গ সনাক্তকরণ)' : '2. BanglaBERT NER (Medicine-Disease-Organ Detection)'}</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`# Train BanglaBERT for medical NER
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import TrainingArguments, Trainer

model_name = "sagorsarker/bangla-bert-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Labels: Medicine, Organ, Disease, Hormone, PharmClass, O
label_list = ["O", "B-MED", "I-MED", "B-ORG", "I-ORG", 
              "B-DIS", "I-DIS", "B-HOR", "I-HOR", "B-PHR", "I-PHR"]

# Load your MedER_Dataset_Bengali CSV and convert to BIO format
# Each row: medical_text → tokenize → assign labels based on entity columns

model = AutoModelForTokenClassification.from_pretrained(
    model_name, num_labels=len(label_list)
)

training_args = TrainingArguments(
    output_dir="./banglabert-medner",
    num_train_epochs=10,
    per_device_train_batch_size=16,
    learning_rate=2e-5,
    save_strategy="epoch",
)

trainer = Trainer(model=model, args=training_args, ...)
trainer.train()
trainer.save_model("./banglabert-medner-final")`}</pre>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="font-semibold text-foreground">{lang === 'bn' ? '৩. বিশেষজ্ঞ শ্রেণীবিভাগ মডেল' : '3. Specialist Classification Model'}</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`# Train specialist classifier
from transformers import pipeline, AutoModelForSequenceClassification

model_name = "sagorsarker/bangla-bert-base"
# Fine-tune on Specialist_Classification.csv
# Input: Problem text → Output: Specialist type

# Or use XGBoost with TF-IDF:
from sklearn.feature_extraction.text import TfidfVectorizer

df = pd.read_csv('specialist_classification.csv')
tfidf = TfidfVectorizer(max_features=5000)
X = tfidf.fit_transform(df['Problem'])
y = LabelEncoder().fit_transform(df['Specialist'])

model = XGBClassifier(n_estimators=150)
model.fit(X_train, y_train)`}</pre>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="font-semibold text-foreground">{lang === 'bn' ? '৪. আপনার অ্যাপে মডেল সংযুক্ত করুন' : '4. Connect Models to Your App'}</p>
            <p>{lang === 'bn' 
              ? 'ট্রেনড মডেলগুলো একটি Python API (FastAPI/Flask) দিয়ে হোস্ট করুন, তারপর Edge Function থেকে কল করুন।'
              : 'Host trained models via a Python API (FastAPI/Flask), then call from the Edge Function.'}</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">{`# FastAPI endpoint example
from fastapi import FastAPI
import joblib, json
app = FastAPI()

model = joblib.load("xgboost_triage.joblib")
le = joblib.load("label_encoder.joblib")
columns = json.load(open("symptom_columns.json"))

@app.post("/predict")
async def predict(symptoms: list[str]):
    # Convert symptom text to binary vector
    vector = [1 if col in symptoms else 0 for col in columns]
    proba = model.predict_proba([vector])[0]
    top_5 = sorted(enumerate(proba), key=lambda x: -x[1])[:5]
    return [{"disease": le.inverse_transform([i])[0], 
             "confidence": float(p)} for i, p in top_5]

# Deploy to: Hugging Face Spaces, Railway, Render, or AWS Lambda
# Then in your Edge Function:
# const resp = await fetch("https://your-ml-api.com/predict", {...})`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
