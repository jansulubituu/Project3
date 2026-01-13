import { Response } from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { AiGenerationJob, AiPromptTemplate, Exam, Question, Course, ExamTemplate } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Create AI generation job
 * @route   POST /api/ai/exams/generate
 * @access  Private/Instructor or Admin
 */
export const createGenerationJob = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      course,
      section,
      inputType,
      sources,
      prompt,
      targetTemplate: rawTargetTemplate,
      targetExam,
    } = req.body;

    // Normalize targetTemplate - handle empty strings, null, undefined
    const targetTemplate = rawTargetTemplate && typeof rawTargetTemplate === 'string' && rawTargetTemplate.trim() 
      ? rawTargetTemplate.trim() 
      : null;

    console.log('[AI Exam Generate] Request received:', {
      course,
      section,
      inputType,
      sourcesCount: sources?.length || 0,
      promptLength: prompt?.length || 0,
      rawTargetTemplate,
      targetTemplate,
      targetExam,
      targetTemplateType: typeof rawTargetTemplate,
    });

    // Verify course exists and user has permission
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && courseDoc.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate exams for this course',
      });
    }

    // Verify template if provided
    if (targetTemplate) {
      console.log('[AI Exam Generate] Verifying template:', targetTemplate);
      const template = await ExamTemplate.findById(targetTemplate);
      if (!template) {
        console.warn('[AI Exam Generate] Template not found:', targetTemplate);
        return res.status(400).json({
          success: false,
          message: 'Template not found',
        });
      }
      if (template.course.toString() !== course) {
        console.warn('[AI Exam Generate] Template course mismatch:', {
          templateCourse: template.course.toString(),
          requestCourse: course,
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid template for this course',
        });
      }
      console.log('[AI Exam Generate] Template verified:', {
        templateId: template._id,
        title: template.title,
        numberOfQuestions: template.numberOfQuestions,
      });
    } else {
      console.log('[AI Exam Generate] No template provided');
    }

    // Validate inputType and sources consistency
    const sourcesArray = sources || [];
    if (inputType === 'course_material') {
      // Must have at least one lesson source
      const hasLessonSource = sourcesArray.some((s: any) => s.type === 'lesson' && s.lessonId);
      if (!hasLessonSource) {
        return res.status(400).json({
          success: false,
          message: 'course_material inputType requires at least one lesson source',
        });
      }
    } else if (inputType === 'uploaded_file') {
      // Must have at least one file/text source
      const hasFileSource = sourcesArray.some((s: any) => 
        (s.type === 'file' && s.fileContent) || 
        (s.type === 'text' && s.textExcerpt)
      );
      if (!hasFileSource) {
        return res.status(400).json({
          success: false,
          message: 'uploaded_file inputType requires at least one file or text source',
        });
      }
    } else if (inputType === 'prompt_only') {
      // prompt_only can have empty sources or optional sources
      // No validation needed, sources can be empty
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid inputType: ${inputType}. Must be one of: uploaded_file, course_material, prompt_only`,
      });
    }

    // Create job
    const job = await AiGenerationJob.create({
      course,
      section: section || null,
      inputType,
      sources: sourcesArray,
      prompt,
      targetTemplate: targetTemplate || null,
      targetExam: targetExam || null,
      status: 'pending',
      createdBy: req.user.id,
      provider: process.env.AI_PROVIDER || 'huggingface', // Default to Hugging Face (free)
      aiModel: process.env.AI_MODEL || 'MiniMaxAI/MiniMax-M2.1:novita', // Recommended model via router
    });

    // Start processing asynchronously (in production, use a queue system)
    processAiGenerationJob(job._id.toString()).catch((error) => {
      console.error('Error processing AI generation job:', error);
    });

    res.status(201).json({
      success: true,
      message: 'AI generation job created',
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating AI generation job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get generation job status
 * @route   GET /api/ai/jobs/:jobId
 * @access  Private/Instructor or Admin
 */
export const getGenerationJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { jobId } = req.params;

    const job = await AiGenerationJob.findById(jobId)
      .populate({
        path: 'course',
        select: 'title slug instructor',
      })
      .populate({
        path: 'resultExamId',
        select: 'title status',
      })
      .populate({
        path: 'resultQuestionIds',
        select: 'type difficulty text points',
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const course = job.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job',
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Publish generated exam
 * @route   POST /api/ai/exams/:examId/publish
 * @access  Private/Instructor or Admin
 */
export const publishGeneratedExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { examId } = req.params;

    const exam = await Exam.findById(examId).populate('course');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course = exam.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this exam',
      });
    }

    // Check if exam was generated by AI
    const job = await AiGenerationJob.findOne({ resultExamId: examId });
    if (!job) {
      return res.status(400).json({
        success: false,
        message: 'This exam was not generated by AI',
      });
    }

    // Publish exam
    exam.status = 'published';
    await exam.save();

    res.json({
      success: true,
      message: 'Exam published successfully',
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing exam',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    List available Gemini models
 * @route   GET /api/ai/models
 * @access  Private/Instructor or Admin
 */
export const listAvailableModels = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'GOOGLE_API_KEY not configured',
      });
    }

    try {
      // Use REST API to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Filter models that support generateContent
      const availableModels = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({
          name: m.name,
          displayName: m.displayName,
          description: m.description,
          supportedMethods: m.supportedGenerationMethods,
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
        }))
        .sort((a: any, b: any) => {
          // Sort by version (2.5 > 2.0 > 1.5)
          const getVersion = (name: string) => {
            const match = name.match(/gemini-(\d+)\.(\d+)/);
            return match ? parseFloat(`${match[1]}.${match[2]}`) : 0;
          };
          return getVersion(b.name) - getVersion(a.name);
        });

      // Find recommended model (prefer 2.0-flash or 2.5-flash)
      const recommended = availableModels.find((m: any) => 
        m.name.includes('2.0-flash') || m.name.includes('2.5-flash')
      )?.name || availableModels[0]?.name;

      res.json({
        success: true,
        models: availableModels,
        count: availableModels.length,
        recommended: recommended,
      });
    } catch (error) {
      console.error('Error listing Gemini models:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching available models',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing models',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    List prompt templates
 * @route   GET /api/ai/prompt-templates
 * @access  Private/Instructor or Admin
 */
export const listPromptTemplates = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const templates = await AiPromptTemplate.find({ isActive: true })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing prompt templates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Async function to process AI generation job
 * In production, this should be handled by a job queue (Bull, Agenda, etc.)
 */
async function processAiGenerationJob(jobId: string) {
  try {
    const job = await AiGenerationJob.findById(jobId);
    if (!job) return;

    job.status = 'processing';
    await job.save();

    // Extract content from sources based on inputType
    let sourceContent = '';
    const Lesson = mongoose.model('Lesson');
    
    console.log(`📚 Extracting content for inputType: ${job.inputType} from ${job.sources.length} source(s)...`);
    
    // Handle prompt_only: no source extraction needed
    if (job.inputType === 'prompt_only') {
      console.log('✅ prompt_only mode: using prompt only, no source content extraction');
      sourceContent = ''; // Explicitly empty for prompt_only
    } else {
      // Extract content from sources for course_material and uploaded_file
      for (const source of job.sources) {
        if (source.type === 'lesson' && source.lessonId) {
          const lesson = await Lesson.findById(source.lessonId);
          if (lesson) {
            const lessonData = lesson as any;
            sourceContent += `\n\n=== Lesson: ${lessonData.title} ===\n`;
            
            // Add description
            if (lessonData.description) {
              sourceContent += `Description: ${lessonData.description}\n`;
            }
            
            // Add article content (for article type lessons)
            if (lessonData.articleContent) {
              sourceContent += `\nContent:\n${lessonData.articleContent}\n`;
            }
            
            // Add video transcript if available
            if (lessonData.videoTranscript) {
              sourceContent += `\nVideo Transcript:\n${lessonData.videoTranscript}\n`;
            }
            
            // Add quiz questions content if available
            if (lessonData.quizQuestions && lessonData.quizQuestions.length > 0) {
              sourceContent += `\nQuiz Questions:\n`;
              lessonData.quizQuestions.forEach((q: any, idx: number) => {
                sourceContent += `${idx + 1}. ${q.question}\n`;
                if (q.options && q.options.length > 0) {
                  sourceContent += `   Options: ${q.options.join(', ')}\n`;
                }
                sourceContent += `   Correct Answer: ${q.correctAnswer}\n`;
                if (q.explanation) {
                  sourceContent += `   Explanation: ${q.explanation}\n`;
                }
              });
            }
            
            console.log(`✅ Extracted content from lesson: ${lessonData.title}`);
          } else {
            console.warn(`⚠️ Lesson not found: ${source.lessonId}`);
          }
        } else if (source.type === 'text' && source.textExcerpt) {
          sourceContent += `\n\n=== Text Content ===\n${source.textExcerpt}\n`;
          console.log(`✅ Extracted text content (${source.textExcerpt.length} chars)`);
        } else if (source.type === 'file' && source.fileContent) {
          sourceContent += `\n\n=== File Content ===\n${source.fileContent}\n`;
          console.log(`✅ Extracted file content (${source.fileContent.length} chars)`);
        } else if (source.type === 'url' && source.url) {
          // In production, fetch and parse URL content
          sourceContent += `\n\n=== URL Content ===\nURL: ${source.url}\n`;
          console.log(`⚠️ URL content extraction not implemented: ${source.url}`);
        }
      }
    }
    
    // Log extracted content summary
    if (job.inputType === 'prompt_only') {
      console.log('📝 prompt_only mode: no source content (using prompt only)');
    } else if (sourceContent.trim()) {
      console.log(`📝 Total extracted content: ${sourceContent.length} characters`);
    } else {
      console.warn(`⚠️ No content extracted from sources for inputType: ${job.inputType}!`);
      if (job.inputType === 'course_material') {
        console.warn('⚠️ course_material requires lesson sources with content');
      } else if (job.inputType === 'uploaded_file') {
        console.warn('⚠️ uploaded_file requires file/text sources with content');
      }
    }

    // Build prompt for AI
    const fullPrompt = await buildAiPrompt(job.prompt, sourceContent, job.targetTemplate);
    console.log(`📝 Built prompt (${fullPrompt.length} characters)`);

    // Call AI service
    console.log(`🤖 Calling AI service: ${job.provider} / ${job.aiModel}...`);
    const aiResponse = await callAiService(fullPrompt, job.provider, job.aiModel);
    console.log(`✅ Received AI response (${aiResponse.length} characters)`);

    // Parse AI response and create questions
    console.log(`📋 Parsing AI response...`);
    const questions = parseAiResponse(aiResponse, job.course, job.section, job.createdBy);
    console.log(`✅ Parsed ${questions.length} questions`);

    // Create questions in database
    const createdQuestions = await Question.insertMany(questions);
    const questionIds = createdQuestions.map((q) => q._id);

    // Create exam from template or use existing
    let exam: any = null;
    if (job.targetExam) {
      exam = await Exam.findById(job.targetExam);
      if (exam) {
        // Add questions to existing exam
        exam.questions = questionIds.map((id, index) => ({
          question: id,
          order: index + 1,
          weight: 1,
        }));
        await exam.save();
      }
    } else {
      // Create new exam
      const template = job.targetTemplate
        ? await ExamTemplate.findById(job.targetTemplate)
        : null;

      const examTitle = template
        ? `${template.title} - ${new Date().toLocaleDateString()}`
        : `AI Generated Exam - ${new Date().toLocaleDateString()}`;

      const slug = examTitle
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-') + `-${Date.now()}`;

      // Use template description if available, otherwise use default
      const examDescription = template?.description || 'AI generated exam';

      exam = await Exam.create({
        course: job.course,
        section: job.section || template?.section || null,
        title: examTitle,
        description: examDescription,
        slug,
        status: 'draft',
        questions: questionIds.map((id, index) => ({
          question: id,
          order: index + 1,
          weight: 1,
        })),
        totalPoints: createdQuestions.reduce((sum, q) => sum + q.points, 0),
        passingScore: 0,
        shuffleQuestions: template?.shuffleQuestions ?? false,
        shuffleAnswers: template?.shuffleAnswers ?? false,
        durationMinutes: 60,
        maxAttempts: null,
        scoringMethod: 'highest',
        showCorrectAnswers: 'after_submit',
        showScoreToStudent: true,
        allowLateSubmission: false,
        latePenaltyPercent: 0,
        timeLimitType: 'per_attempt',
        createdBy: job.createdBy,
      });
      
      console.log(`[AI Exam] Created exam from template: ${template ? template.title : 'none'}`, {
        examId: exam._id,
        questionCount: createdQuestions.length,
        templateQuestionCount: template?.numberOfQuestions,
      });
    }

    // Update job
    if (exam) {
      job.status = 'completed';
      job.resultExamId = exam._id;
      job.resultQuestionIds = questionIds;
      job.logs = JSON.stringify({ questionsGenerated: questions.length, examCreated: true });
      await job.save();
    } else {
      throw new Error('Failed to create exam');
    }
  } catch (error) {
    const job = await AiGenerationJob.findById(jobId);
    if (job) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await job.save();
    }
    console.error('Error processing AI generation job:', error);
  }
}

/**
 * Build AI prompt from template and source content
 */
async function buildAiPrompt(
  userPrompt: string,
  sourceContent: string,
  templateId: mongoose.Types.ObjectId | null | undefined
): Promise<string> {
  let prompt = `You are an expert educational content creator. Generate exam questions based on the provided material and instructions.

OUTPUT FORMAT:
You must respond with a valid JSON object strictly following this schema:
{
  "questions": [
    {
      "type": "single_choice" | "multiple_choice" | "short_answer",
      "difficulty": "easy" | "medium" | "hard",
      "text": "Question text here",
      "points": number,
      "options": [{"id": "a", "text": "Option A", "isCorrect": boolean}, ...], // Required for choice types
      "expectedAnswers": ["answer1", "answer2"], // Required for short_answer
      "explanation": "Explanation of the correct answer"
    }
  ]
}

IMPORTANT RULES:
1. Return ONLY the JSON object. No markdown formatting, no code blocks.
2. Ensure valid JSON syntax.
3. For 'single_choice', exactly one option must be 'isCorrect': true.
4. For 'multiple_choice', at least one option must be 'isCorrect': true.
5. Create high-quality, academic questions.
\n`;

  if (sourceContent) {
    prompt += `SOURCE MATERIAL:\n${sourceContent.substring(0, 100000)}\n\n`; // Safety limit
  }

  // Load and integrate exam template if provided
  if (templateId) {
    try {
      const template = await ExamTemplate.findById(templateId).lean();
      if (!template) {
        console.warn(`[AI Prompt] Template not found: ${templateId}`);
      } else {
        console.log(`[AI Prompt] Loading template: ${template.title}`, {
          numberOfQuestions: template.numberOfQuestions,
          hasDifficultyDistribution: !!template.difficultyDistribution?.length,
          hasTypeDistribution: !!template.typeDistribution?.length,
          hasTopicDistribution: !!template.topicDistribution?.length,
        });

        prompt += `EXAM TEMPLATE REQUIREMENTS:\n`;
        prompt += `- Number of questions: ${template.numberOfQuestions}\n`;
        
        // Difficulty distribution from database
        if (template.difficultyDistribution && Array.isArray(template.difficultyDistribution) && template.difficultyDistribution.length > 0) {
          prompt += `- Difficulty distribution:\n`;
          template.difficultyDistribution.forEach((rule) => {
            if (rule && rule.level && typeof rule.ratio === 'number') {
              const percentage = (rule.ratio * 100).toFixed(0);
              const count = Math.round(template.numberOfQuestions * rule.ratio);
              prompt += `  * ${rule.level}: ${percentage}% (approximately ${count} questions)\n`;
            }
          });
        }
        
        // Type distribution from database
        if (template.typeDistribution && Array.isArray(template.typeDistribution) && template.typeDistribution.length > 0) {
          prompt += `- Question type distribution:\n`;
          template.typeDistribution.forEach((rule) => {
            if (rule && rule.type && typeof rule.ratio === 'number') {
              const percentage = (rule.ratio * 100).toFixed(0);
              const count = Math.round(template.numberOfQuestions * rule.ratio);
              prompt += `  * ${rule.type}: ${percentage}% (approximately ${count} questions)\n`;
            }
          });
        }
        
        // Topic distribution from database
        if (template.topicDistribution && Array.isArray(template.topicDistribution) && template.topicDistribution.length > 0) {
          prompt += `- Topic distribution:\n`;
          template.topicDistribution.forEach((rule) => {
            if (rule && rule.tag && typeof rule.ratio === 'number') {
              const percentage = (rule.ratio * 100).toFixed(0);
              const count = Math.round(template.numberOfQuestions * rule.ratio);
              prompt += `  * ${rule.tag}: ${percentage}% (approximately ${count} questions)\n`;
            }
          });
        }
        
        if (template.description) {
          prompt += `- Template description: ${template.description}\n`;
        }
        
        prompt += `\nIMPORTANT: You must generate exactly ${template.numberOfQuestions} questions following the distribution requirements above. Make sure the total matches the specified number.\n\n`;
        
        console.log(`[AI Prompt] Template requirements added to prompt`);
      }
    } catch (templateError) {
      console.error('[AI Prompt] Failed to load exam template:', templateError);
      // Continue without template if loading fails
    }
  }

  prompt += `USER INSTRUCTIONS:\n${userPrompt}\n\n`;

  return prompt;
}

/**
 * Call AI service (placeholder - implement actual integration)
 */
async function callAiService(
  prompt: string,
  provider?: string,
  model?: string
): Promise<string> {
  const aiProvider = provider || process.env.AI_PROVIDER || 'huggingface'; // Default to Hugging Face (free)
  const aiModel = model || process.env.AI_MODEL || 'MiniMaxAI/MiniMax-M2.1:novita'; // Recommended model via router

  console.log(`🤖 Calling AI Service: ${aiProvider} with model ${aiModel}`);

  // Hugging Face via OpenAI-compatible API (Free tier: 1000 RPD)
  if (aiProvider === 'huggingface' && process.env.HF_API_KEY) {
    try {
      const modelName = aiModel || 'MiniMaxAI/MiniMax-M2.1:novita'; // Recommended model via router
      
      // Use OpenAI SDK with Hugging Face router endpoint (OpenAI-compatible)
      const hfClient = new OpenAI({
        baseURL: 'https://router.huggingface.co/v1',
        apiKey: process.env.HF_API_KEY,
      });

      const completion = await hfClient.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates exam questions in JSON format. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }, // Request JSON format
        max_tokens: 2000,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content returned from Hugging Face');
      }

      console.log('✅ Hugging Face API success (via OpenAI-compatible router)');
      return content;
    } catch (error) {
      console.error('❌ Hugging Face API Error:', error);
      
      // Fallback: Try old inference API if router fails
      try {
        console.log('⚠️ Router failed, trying inference API fallback...');
        const modelName = aiModel || 'MiniMaxAI/MiniMax-M2.1:novita';
        const apiUrl = `https://api-inference.huggingface.co/models/${modelName}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature: 0.7,
              max_new_tokens: 2000,
              return_full_text: false,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Inference API also failed: ${response.status}`);
        }

        const data: any = await response.json();
        let generatedText = '';
        
        if (Array.isArray(data) && data.length > 0) {
          generatedText = data[0].generated_text || data[0].text || '';
        } else if (data && typeof data === 'object' && data.generated_text) {
          generatedText = data.generated_text;
        }

        if (!generatedText) {
          throw new Error('No content returned from Hugging Face');
        }

        // Extract JSON from text response
        let jsonText = generatedText.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }

        console.log('✅ Hugging Face Inference API success (fallback)');
        return jsonText;
      } catch (fallbackError) {
        throw new Error(`AI Generation failed: ${(error as Error).message}`);
      }
    }
  }

  // Google Gemini (Free tier: 1500 RPD, recommended)
  if (aiProvider === 'gemini' && process.env.GOOGLE_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      
      // Fix model name - use correct Gemini model identifiers
      // Try to get available models first, or use known working models
      let modelName = aiModel || 'gemini-1.5-flash';
      
      // Map common model names to correct identifiers
      const modelMap: Record<string, string> = {
        'gemini-1.5-flash': 'gemini-1.5-flash',
        'gemini-1.5-flash-latest': 'gemini-1.5-flash', // Remove -latest
        'gemini-1.5-pro': 'gemini-1.5-pro',
        'gemini-1.5-pro-latest': 'gemini-1.5-pro',
        'gemini-2.0-flash': 'gemini-2.0-flash-exp', // Experimental models need -exp
        'gemini-2.5-flash': 'gemini-2.5-flash-exp',
        'gemini-pro': 'gemini-pro', // Legacy
      };
      
      // Use mapped name if available, otherwise use as-is
      modelName = modelMap[modelName] || modelName;
      
      // For v1beta API, use models without -latest suffix
      if (modelName.endsWith('-latest')) {
        modelName = modelName.replace('-latest', '');
      }
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      });
  
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (!text) throw new Error('No content returned from Gemini');
        console.log('✅ Gemini API success');
        return text;
      } catch (error) {
        console.error('❌ Gemini API Error:', error);
        throw new Error(`AI Generation failed: ${(error as Error).message}`);
      }
    }
  
    // OpenAI (keep existing code below)


  if (aiProvider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates exam questions in JSON format.' },
          { role: 'user', content: prompt }
        ],
        model: aiModel,
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content returned from OpenAI');

      return content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI Generation failed: ${(error as Error).message}`);
    }
  }

  // Fallback: return mock response for development if no key
  console.warn('⚠️ ========================================');
  console.warn('⚠️ NO AI API KEY FOUND - Using DEMO MODE');
  console.warn('⚠️ ========================================');
  console.warn('💡 To generate REAL questions, get a FREE API key:');
  console.warn('   🎯 Hugging Face (RECOMMENDED - Free 1000 RPD):');
  console.warn('      https://huggingface.co/settings/tokens');
  console.warn('   🎯 Google Gemini (1500 RPD):');
  console.warn('      https://aistudio.google.com/app/apikey');
  console.warn('   ⚡ Groq (14,400 RPD):');
  console.warn('      https://console.groq.com/keys');
  console.warn('');
  console.warn('📝 Then add to backend/.env:');
  console.warn('   HF_API_KEY=your_token_here');
  console.warn('   AI_PROVIDER=huggingface');
  console.warn('   AI_MODEL=mistralai/Mistral-7B-Instruct-v0.2');
  console.warn('⚠️ ========================================');
  
  return JSON.stringify({
    questions: [
      {
        type: 'single_choice',
        difficulty: 'easy',
        text: '⚠️ DEMO MODE: Configure AI provider to generate real questions. Which provider is recommended?',
        points: 1,
        options: [
          { id: 'a', text: '✅ Hugging Face - Free 1000 requests/day (RECOMMENDED)', isCorrect: true },
          { id: 'b', text: 'Google Gemini - Free 1500 requests/day', isCorrect: false },
          { id: 'c', text: 'Groq - Free 14,400 requests/day (Fast)', isCorrect: false },
          { id: 'd', text: 'OpenAI - Paid (High quality)', isCorrect: false },
        ],
        explanation: 'Demo mode: Add HF_API_KEY to backend/.env to generate real questions. Get free token at: https://huggingface.co/settings/tokens',
      },
    ],
  });
}

/**
 * Parse AI response and create question objects
 * Handles various response formats including markdown code blocks and incomplete JSON
 */
function parseAiResponse(
  aiResponse: string,
  courseId: mongoose.Types.ObjectId,
  sectionId: mongoose.Types.ObjectId | null | undefined,
  ownerId: mongoose.Types.ObjectId
): any[] {
  try {
    // Clean the response: remove markdown code blocks, whitespace, etc.
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    // Handle both opening and closing tags
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/i, '');
    cleanedResponse = cleanedResponse.replace(/\n?```\s*$/i, '');
    
    // Remove any leading/trailing whitespace
    cleanedResponse = cleanedResponse.trim();
    
    // Try to extract JSON object if there's extra text
    // Look for first { and last } to extract JSON object
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    // Try to fix common JSON issues
    // Remove trailing commas before closing brackets/braces
    cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to close incomplete JSON structures
    // Count open braces and brackets
    const openBraces = (cleanedResponse.match(/{/g) || []).length;
    const closeBraces = (cleanedResponse.match(/}/g) || []).length;
    const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
    const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;
    
    // Close missing brackets/braces
    if (openBrackets > closeBrackets) {
      cleanedResponse += ']'.repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      cleanedResponse += '}'.repeat(openBraces - closeBraces);
    }
    
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If still fails, try to extract just the questions array
      const questionsMatch = cleanedResponse.match(/"questions"\s*:\s*\[([\s\S]*?)\]/);
      if (questionsMatch) {
        try {
          // Try to parse just the questions array
          const questionsArrayStr = '[' + questionsMatch[1] + ']';
          const questionsArray = JSON.parse(questionsArrayStr);
          parsed = { questions: questionsArray };
        } catch (arrayError) {
          throw parseError; // Throw original error
        }
      } else {
        throw parseError; // Throw original error
      }
    }
    
    const questions = parsed.questions || [];

    if (questions.length === 0) {
      console.warn('[AI Parse] No questions found in parsed response');
      console.warn('[AI Parse] Parsed object keys:', Object.keys(parsed));
      return [];
    }

    console.log(`[AI Parse] Successfully parsed ${questions.length} questions`);

    return questions.map((q: any) => ({
      course: courseId,
      section: sectionId || null,
      owner: ownerId,
      type: q.type || 'single_choice',
      difficulty: q.difficulty || 'medium',
      text: q.text,
      images: q.images || [],
      options: q.options || [],
      expectedAnswers: q.expectedAnswers || [],
      caseSensitive: false,
      maxSelectable: q.type === 'multiple_choice' ? null : 1,
      points: q.points || 1,
      negativeMarking: false,
      negativePoints: 0,
      tags: q.tags || [],
      topic: q.topic,
      cognitiveLevel: q.cognitiveLevel,
      isActive: true,
      version: 1,
      parentQuestion: null,
      isArchived: false,
    }));
  } catch (error) {
    console.error('[AI Parse] Error parsing AI response:', error);
    console.error('[AI Parse] Response content (first 1000 chars):', aiResponse.substring(0, 1000));
    console.error('[AI Parse] Response content (last 500 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 500)));
    return [];
  }
}
