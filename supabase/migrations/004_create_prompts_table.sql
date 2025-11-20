-- Create prompts table for managing GPT prompts
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  prompt_name VARCHAR(200) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on prompt_key for faster lookups
CREATE INDEX idx_prompts_prompt_key ON prompts(prompt_key);

-- Insert default prompts
INSERT INTO prompts (prompt_key, prompt_name, description, system_prompt, user_prompt_template) VALUES
(
  'daily_summary',
  '일일보고 요약 생성',
  '일일업무보고 페이지에서 사용되는 AI 요약 생성 프롬프트',
  '당신은 기업의 일일업무보고를 요약하는 전문가입니다. 간결하고 명확하게 핵심 내용을 전달하는 요약문을 작성합니다.',
  '다음은 회사의 일일업무보고 내용입니다. 이를 바탕으로 간결하고 명확한 일일보고 요약을 작성해주세요.

요약 작성 시 다음 사항을 준수해주세요:
1. 중요한 프로젝트나 업무를 중심으로 작성
2. 부서별 주요 업무 진행 상황을 포함
3. 완료된 업무와 진행 중인 업무를 구분하여 작성
4. 특이사항이나 이슈가 있다면 명시
5. 3-5개의 문장으로 구성
6. 업무의 우선순위와 중요도를 고려하여 작성

예시 형식:
"[프로젝트명]은 [진행상황]입니다. [부서명]에서는 [주요업무] 진행했고, [완료/진행률]입니다. [다른 부서]는 [업무내용] 작업 중이며, [예정사항]입니다. 이외에 [기타 특이사항]이 있었습니다."

{{REPORT_DATA}}

위 내용을 바탕으로 일일보고 요약을 작성해주세요:'
),
(
  'personal_summary_ai',
  '개인 업무 보고 AI 요약',
  '개인 업무 보고 페이지에서 사용되는 AI 요약 생성 프롬프트',
  '당신은 업무 보고서를 분석하여 구조화된 JSON 형식으로 요약하는 전문가입니다.
주어진 보고서들을 분석하여 프로젝트/업무 단위로 그룹화하고, 인원별 성과를 정리해주세요.

반드시 다음 JSON 구조를 따라주세요:
{
  "title": "업무 보고 요약",
  "period": "YYYY-MM-DD ~ YYYY-MM-DD 형식 또는 YYYY-MM",
  "target": "전체 또는 특정 부서/사원명",
  "overallAchievementRate": 전체 평균 달성률 (숫자),
  "projects": [
    {
      "projectName": "프로젝트명",
      "order": 순서번호,
      "tasks": [
        {
          "title": "작업 제목",
          "description": "작업 설명",
          "assignees": ["담당자1", "담당자2"],
          "frequency": 수행 횟수,
          "dateRange": "날짜 범위",
          "achievementRate": 달성률
        }
      ],
      "results": {
        "period": "작업 기간",
        "participants": ["참여자1", "참여자2"],
        "avgAchievementRate": 평균 달성률,
        "totalTasks": 총 작업 수,
        "status": "완료" | "진행중" | "지연"
      }
    }
  ],
  "employees": [
    {
      "name": "사원명",
      "department": "부서명",
      "totalReports": 보고서 수,
      "avgAchievementRate": 평균 달성률,
      "mainProjects": ["프로젝트1", "프로젝트2"],
      "performance": "우수" | "양호" | "개선필요"
    }
  ],
  "summaryTable": [
    {
      "projectName": "프로젝트명",
      "taskCount": 작업 수,
      "achievementRate": 달성률,
      "status": "✅ 완료" | "🔄 진행중" | "⚠️ 지연"
    }
  ],
  "specialNotes": [
    {
      "type": "연차" | "기타",
      "content": "내용"
    }
  ],
  "recommendation": "전체적인 평가 및 제안사항"
}

프로젝트는 업무 개요의 주요 키워드나 주제로 그룹화하세요.
달성률 90% 이상은 "우수/완료", 70-89%는 "양호/진행중", 70% 미만은 "개선필요/지연"으로 분류하세요.',
  '다음 업무 보고서들을 분석하여 JSON 형식으로 요약해주세요:

필터 조건:
- 기간: {{PERIOD}}
- 부서: {{DEPARTMENT}}
- 사원: {{EMPLOYEE}}

보고서 데이터:
{{REPORT_DATA}}

연차 및 미작성 보고서:
{{LEAVE_DATA}}'
);

-- Enable Row Level Security
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be customized later for admin-only access)
CREATE POLICY "Allow all operations on prompts" ON prompts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE prompts IS 'Stores GPT prompts for various AI features in the system';
