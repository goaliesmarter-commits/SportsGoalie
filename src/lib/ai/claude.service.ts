import { logger } from '@/lib/utils/logger';

export interface ClaudeAIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface GenerateHTMLOptions {
  skillName: string;
  description: string;
  difficulty: string;
  objectives: string[];
  existingContent?: string;
}

export interface GradeAnswerOptions {
  questionText: string;
  questionContent: string;
  userAnswer: string | string[];
  correctAnswer?: string | string[];
  sampleAnswer?: string;
  rubric?: string[];
  maxPoints: number;
}

export interface GradeAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  feedback?: string;
  error?: string;
}

class ClaudeAIService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('ANTHROPIC_API_KEY not found in environment variables', 'ClaudeAIService');
    }
  }

  async generateSkillHTML(options: GenerateHTMLOptions): Promise<ClaudeAIResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Claude AI API key not configured'
      };
    }

    try {
      const prompt = this.buildPrompt(options);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Claude API request failed', 'ClaudeAIService', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        logger.error('Invalid response format from Claude API', 'ClaudeAIService', { data });
        return {
          success: false,
          error: 'Invalid response format from Claude API'
        };
      }

      let generatedHTML = data.content[0].text.trim();

      // Remove markdown code blocks if present
      if (generatedHTML.startsWith('```html')) {
        generatedHTML = generatedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (generatedHTML.startsWith('```')) {
        generatedHTML = generatedHTML.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }

      logger.info('Successfully generated HTML content', 'ClaudeAIService', {
        skillName: options.skillName,
        contentLength: generatedHTML.length
      });

      return {
        success: true,
        content: generatedHTML
      };

    } catch (error) {
      logger.error('Error generating HTML with Claude AI', 'ClaudeAIService', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildPrompt(options: GenerateHTMLOptions): string {
    const { skillName, description, difficulty, objectives, existingContent } = options;

    let prompt = `You are an expert instructional designer creating HTML content for a sports coaching platform.

Generate comprehensive, well-structured HTML content for a skill lesson with the following details:

**Skill Name:** ${skillName}
**Description:** ${description}
**Difficulty Level:** ${difficulty}
**Learning Objectives:**
${objectives.map(obj => `- ${obj}`).join('\n')}`;

    if (existingContent && existingContent.trim()) {
      prompt += `\n\n**Existing Content to Enhance:**
${existingContent}

Please enhance and expand the existing content while maintaining its core structure.`;
    }

    prompt += `

**Requirements:**
1. Create engaging, educational HTML content suitable for sports skill learning
2. Use proper semantic HTML5 elements (section, article, header, etc.)
3. Include these sections:
   - Introduction/Overview
   - Key Concepts
   - Step-by-step instructions or techniques
   - Common mistakes to avoid
   - Practice exercises or drills
   - Tips for improvement
   - Summary/Key takeaways

4. Use appropriate HTML classes for styling (assume Tailwind CSS is available):
   - Use "text-lg font-semibold mb-4" for section headers
   - Use "mb-4" for paragraph spacing
   - Use "list-disc list-inside mb-4" for unordered lists
   - Use "bg-blue-50 p-4 rounded-lg mb-4" for tip boxes
   - Use "bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" for warning/mistake boxes

5. Make content interactive and engaging with:
   - Clear headings and subheadings
   - Bullet points for easy scanning
   - Highlighted tips and warnings
   - Structured practice exercises

6. Ensure content is appropriate for the ${difficulty} skill level
7. Keep HTML clean and semantic (no inline styles)
8. Return ONLY the HTML content, no markdown code blocks or explanations

Generate the HTML content now:`;

    return prompt;
  }

  async gradeAnswer(options: GradeAnswerOptions): Promise<GradeAnswerResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        isCorrect: false,
        pointsEarned: 0,
        maxPoints: options.maxPoints,
        error: 'Claude AI API key not configured'
      };
    }

    try {
      const prompt = this.buildGradingPrompt(options);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1 // Lower temperature for more consistent grading
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Claude API grading request failed', 'ClaudeAIService', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        return {
          success: false,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: options.maxPoints,
          error: `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        logger.error('Invalid response format from Claude API', 'ClaudeAIService', { data });
        return {
          success: false,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: options.maxPoints,
          error: 'Invalid response format from Claude API'
        };
      }

      const gradingResult = this.parseGradingResponse(data.content[0].text, options.maxPoints);

      logger.info('Successfully graded answer', 'ClaudeAIService', {
        isCorrect: gradingResult.isCorrect,
        pointsEarned: gradingResult.pointsEarned,
        maxPoints: gradingResult.maxPoints
      });

      return {
        success: true,
        ...gradingResult
      };

    } catch (error) {
      logger.error('Error grading answer with Claude AI', 'ClaudeAIService', { error });
      return {
        success: false,
        isCorrect: false,
        pointsEarned: 0,
        maxPoints: options.maxPoints,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildGradingPrompt(options: GradeAnswerOptions): string {
    const { questionText, questionContent, userAnswer, correctAnswer, sampleAnswer, rubric, maxPoints } = options;

    let prompt = `You are an expert teacher grading a student's answer to a quiz question. Evaluate the answer objectively and fairly.

**Question Title:** ${questionText}
**Question Content:** ${questionContent}

**Student's Answer:**
${Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer}
`;

    if (correctAnswer) {
      prompt += `\n**Correct Answer(s):**
${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}
`;
    }

    if (sampleAnswer) {
      prompt += `\n**Sample Answer:**
${sampleAnswer}
`;
    }

    if (rubric && rubric.length > 0) {
      prompt += `\n**Grading Rubric:**
${rubric.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n')}
`;
    }

    prompt += `\n**Maximum Points:** ${maxPoints}

**Your Task:**
1. Evaluate if the student's answer is correct or acceptable
2. Assign points (0 to ${maxPoints}) based on the quality and correctness of the answer
3. Provide brief, constructive feedback

**Important Guidelines:**
- Be flexible with wording - accept answers that convey the same meaning even if worded differently
- For fill-in-blank questions: Accept synonyms and equivalent terms
- For descriptive questions: Grade based on understanding and key concepts covered
- Consider partial credit for partially correct answers
- Be encouraging but honest in your feedback

**Response Format:**
Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "isCorrect": true or false,
  "pointsEarned": number between 0 and ${maxPoints},
  "feedback": "brief constructive feedback (2-3 sentences maximum)"
}`;

    return prompt;
  }

  private parseGradingResponse(responseText: string, maxPoints: number): Omit<GradeAnswerResponse, 'success'> {
    try {
      // Remove any markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }

      const result = JSON.parse(cleanedText);

      // Validate and ensure points are within bounds
      const pointsEarned = Math.max(0, Math.min(result.pointsEarned || 0, maxPoints));
      const isCorrect = result.isCorrect === true;

      return {
        isCorrect,
        pointsEarned,
        maxPoints,
        feedback: result.feedback || 'Answer evaluated'
      };
    } catch (error) {
      logger.error('Error parsing grading response', 'ClaudeAIService', { error, responseText });
      // Fallback: try to determine if answer is correct based on response text
      const lowerText = responseText.toLowerCase();
      const seemsCorrect = lowerText.includes('correct') && !lowerText.includes('incorrect');

      return {
        isCorrect: seemsCorrect,
        pointsEarned: seemsCorrect ? maxPoints : 0,
        maxPoints,
        feedback: 'Answer evaluated (parsing issue, using fallback)'
      };
    }
  }
}

export const claudeAIService = new ClaudeAIService();