"use client";

import { ContactInfoQuestionForm } from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/components/ContactInfoQuestionForm";
import { RankingQuestionForm } from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/components/RankingQuestionForm";
import { formatTextWithSlashes } from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/lib/utils";
import { QuestionFormInput } from "@/modules/surveys/components/QuestionFormInput";
import { Label } from "@/modules/ui/components/label";
import { Switch } from "@/modules/ui/components/switch";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronRightIcon, GripIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@formbricks/lib/cn";
import { QUESTIONS_ICON_MAP, getTSurveyQuestionTypeEnumName } from "@formbricks/lib/utils/questions";
import { recallToHeadline } from "@formbricks/lib/utils/recall";
import { TContactAttributeKey } from "@formbricks/types/contact-attribute-key";
import { TProject } from "@formbricks/types/project";
import {
  TI18nString,
  TSurvey,
  TSurveyQuestion,
  TSurveyQuestionId,
  TSurveyQuestionTypeEnum,
} from "@formbricks/types/surveys/types";
import { TUserLocale } from "@formbricks/types/user";
import { AddressQuestionForm } from "./AddressQuestionForm";
import { AdvancedSettings } from "./AdvancedSettings";
import { CTAQuestionForm } from "./CTAQuestionForm";
import { CalQuestionForm } from "./CalQuestionForm";
import { ConsentQuestionForm } from "./ConsentQuestionForm";
import { DateQuestionForm } from "./DateQuestionForm";
import { EditorCardMenu } from "./EditorCardMenu";
import { FileUploadQuestionForm } from "./FileUploadQuestionForm";
import { MatrixQuestionForm } from "./MatrixQuestionForm";
import { MultipleChoiceQuestionForm } from "./MultipleChoiceQuestionForm";
import { NPSQuestionForm } from "./NPSQuestionForm";
import { OpenQuestionForm } from "./OpenQuestionForm";
import { PictureSelectionForm } from "./PictureSelectionForm";
import { RatingQuestionForm } from "./RatingQuestionForm";

interface QuestionCardProps {
  localSurvey: TSurvey;
  project: TProject;
  question: TSurveyQuestion;
  questionIdx: number;
  moveQuestion: (questionIndex: number, up: boolean) => void;
  updateQuestion: (questionIdx: number, updatedAttributes: any) => void;
  deleteQuestion: (questionIdx: number) => void;
  duplicateQuestion: (questionIdx: number) => void;
  activeQuestionId: TSurveyQuestionId | null;
  setActiveQuestionId: (questionId: TSurveyQuestionId | null) => void;
  lastQuestion: boolean;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (language: string) => void;
  isInvalid: boolean;
  contactAttributeKeys: TContactAttributeKey[];
  addQuestion: (question: any, index?: number) => void;
  isFormbricksCloud: boolean;
  isCxMode: boolean;
  locale: TUserLocale;
}

export const QuestionCard = ({
  localSurvey,
  project,
  question,
  questionIdx,
  moveQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
  activeQuestionId,
  setActiveQuestionId,
  lastQuestion,
  selectedLanguageCode,
  setSelectedLanguageCode,
  isInvalid,
  contactAttributeKeys,
  addQuestion,
  isFormbricksCloud,
  isCxMode,
  locale,
}: QuestionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const t = useTranslations();
  const open = activeQuestionId === question.id;
  const [openAdvanced, setOpenAdvanced] = useState(question.logic && question.logic.length > 0);
  const [parent] = useAutoAnimate();

  const updateEmptyButtonLabels = (
    labelKey: "buttonLabel" | "backButtonLabel",
    labelValue: TI18nString,
    skipIndex: number
  ) => {
    localSurvey.questions.forEach((q, index) => {
      if (index === skipIndex) return;
      const currentLabel = q[labelKey];
      if (!currentLabel || currentLabel[selectedLanguageCode]?.trim() === "") {
        updateQuestion(index, { [labelKey]: labelValue });
      }
    });
  };

  const getIsRequiredToggleDisabled = (): boolean => {
    if (question.type === TSurveyQuestionTypeEnum.Address) {
      const allFieldsAreOptional = [
        question.addressLine1,
        question.addressLine2,
        question.city,
        question.state,
        question.zip,
        question.country,
      ]
        .filter((field) => field.show)
        .every((field) => !field.required);

      if (allFieldsAreOptional) {
        return true;
      }

      return [
        question.addressLine1,
        question.addressLine2,
        question.city,
        question.state,
        question.zip,
        question.country,
      ]
        .filter((field) => field.show)
        .some((condition) => condition.required === true);
    }

    if (question.type === TSurveyQuestionTypeEnum.ContactInfo) {
      const allFieldsAreOptional = [
        question.firstName,
        question.lastName,
        question.email,
        question.phone,
        question.company,
      ]
        .filter((field) => field.show)
        .every((field) => !field.required);

      if (allFieldsAreOptional) {
        return true;
      }

      return [question.firstName, question.lastName, question.email, question.phone, question.company]
        .filter((field) => field.show)
        .some((condition) => condition.required === true);
    }

    return false;
  };

  const handleRequiredToggle = () => {
    // Fix for NPS and Rating questions having missing translations when buttonLabel is not removed
    if (!question.required && (question.type === "nps" || question.type === "rating")) {
      updateQuestion(questionIdx, { required: true, buttonLabel: undefined });
    } else {
      updateQuestion(questionIdx, { required: !question.required });
    }
  };

  const style = {
    transition: transition ?? "transform 100ms ease",
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      className={cn(
        open ? "shadow-lg" : "shadow-md",
        "flex w-full flex-row rounded-lg bg-white duration-300"
      )}
      ref={setNodeRef}
      style={style}
      id={question.id}>
      <div
        {...listeners}
        {...attributes}
        className={cn(
          open ? "bg-slate-700" : "bg-slate-400",
          "top-0 w-10 rounded-l-lg p-2 text-center text-sm text-white hover:cursor-grab hover:bg-slate-600",
          isInvalid && "bg-red-400 hover:bg-red-600",
          "flex flex-col items-center justify-between"
        )}>
        <div className="mt-3 flex w-full justify-center">{QUESTIONS_ICON_MAP[question.type]}</div>

        <button className="opacity-0 hover:cursor-move group-hover:opacity-100">
          <GripIcon className="h-4 w-4" />
        </button>
      </div>
      <Collapsible.Root
        open={open}
        onOpenChange={() => {
          if (activeQuestionId !== question.id) {
            setActiveQuestionId(question.id);
          } else {
            setActiveQuestionId(null);
          }
        }}
        className="w-[95%] flex-1 rounded-r-lg border border-slate-200">
        <Collapsible.CollapsibleTrigger
          asChild
          className={cn(
            open ? "" : " ",
            "flex cursor-pointer justify-between gap-4 rounded-r-lg p-4 hover:bg-slate-50"
          )}>
          <div>
            <div className="flex grow">
              {/*  <div className="-ml-0.5 mr-3 h-6 min-w-[1.5rem] text-slate-400">
                {QUESTIONS_ICON_MAP[question.type]}
              </div> */}
              <div className="flex grow flex-col justify-center" dir="auto">
                <p className="text-sm font-semibold">
                  {recallToHeadline(
                    question.headline,
                    localSurvey,
                    true,
                    selectedLanguageCode,
                    contactAttributeKeys
                  )[selectedLanguageCode]
                    ? formatTextWithSlashes(
                        recallToHeadline(
                          question.headline,
                          localSurvey,
                          true,
                          selectedLanguageCode,
                          contactAttributeKeys
                        )[selectedLanguageCode] ?? ""
                      )
                    : getTSurveyQuestionTypeEnumName(question.type, locale)}
                </p>
                {!open && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {question?.required
                      ? t("environments.surveys.edit.required")
                      : t("environments.surveys.edit.optional")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <EditorCardMenu
                survey={localSurvey}
                cardIdx={questionIdx}
                lastCard={lastQuestion}
                duplicateCard={duplicateQuestion}
                deleteCard={deleteQuestion}
                moveCard={moveQuestion}
                card={question}
                project={project}
                updateCard={updateQuestion}
                addCard={addQuestion}
                cardType="question"
                isCxMode={isCxMode}
                locale={locale}
              />
            </div>
          </div>
        </Collapsible.CollapsibleTrigger>
        <Collapsible.CollapsibleContent className={`flex flex-col px-4 ${open && "pb-4"}`}>
          {question.type === TSurveyQuestionTypeEnum.OpenText ? (
            <OpenQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.MultipleChoiceSingle ? (
            <MultipleChoiceQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.MultipleChoiceMulti ? (
            <MultipleChoiceQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.NPS ? (
            <NPSQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.CTA ? (
            <CTAQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Rating ? (
            <RatingQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Consent ? (
            <ConsentQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Date ? (
            <DateQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.PictureSelection ? (
            <PictureSelectionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.FileUpload ? (
            <FileUploadQuestionForm
              localSurvey={localSurvey}
              project={project}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              isFormbricksCloud={isFormbricksCloud}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Cal ? (
            <CalQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Matrix ? (
            <MatrixQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Address ? (
            <AddressQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.Ranking ? (
            <RankingQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : question.type === TSurveyQuestionTypeEnum.ContactInfo ? (
            <ContactInfoQuestionForm
              localSurvey={localSurvey}
              question={question}
              questionIdx={questionIdx}
              updateQuestion={updateQuestion}
              lastQuestion={lastQuestion}
              selectedLanguageCode={selectedLanguageCode}
              setSelectedLanguageCode={setSelectedLanguageCode}
              isInvalid={isInvalid}
              contactAttributeKeys={contactAttributeKeys}
              locale={locale}
            />
          ) : null}
          <div className="mt-4">
            <Collapsible.Root open={openAdvanced} onOpenChange={setOpenAdvanced} className="mt-5">
              <Collapsible.CollapsibleTrigger className="flex items-center text-sm text-slate-700">
                {openAdvanced ? (
                  <ChevronDownIcon className="mr-1 h-4 w-3" />
                ) : (
                  <ChevronRightIcon className="mr-2 h-4 w-3" />
                )}
                {openAdvanced
                  ? t("environments.surveys.edit.hide_advanced_settings")
                  : t("environments.surveys.edit.show_advanced_settings")}
              </Collapsible.CollapsibleTrigger>

              <Collapsible.CollapsibleContent className="flex flex-col gap-4" ref={parent}>
                {question.type !== TSurveyQuestionTypeEnum.NPS &&
                question.type !== TSurveyQuestionTypeEnum.Rating &&
                question.type !== TSurveyQuestionTypeEnum.CTA ? (
                  <div className="mt-2 flex space-x-2">
                    <div className="w-full">
                      <QuestionFormInput
                        id="buttonLabel"
                        value={question.buttonLabel}
                        label={t("environments.surveys.edit.next_button_label")}
                        localSurvey={localSurvey}
                        questionIdx={questionIdx}
                        maxLength={48}
                        placeholder={lastQuestion ? t("common.finish") : t("common.next")}
                        isInvalid={isInvalid}
                        updateQuestion={updateQuestion}
                        selectedLanguageCode={selectedLanguageCode}
                        setSelectedLanguageCode={setSelectedLanguageCode}
                        onBlur={(e) => {
                          if (!question.buttonLabel) return;
                          let translatedNextButtonLabel = {
                            ...question.buttonLabel,
                            [selectedLanguageCode]: e.target.value,
                          };

                          if (questionIdx === localSurvey.questions.length - 1) return;
                          updateEmptyButtonLabels(
                            "buttonLabel",
                            translatedNextButtonLabel,
                            localSurvey.questions.length - 1
                          );
                        }}
                        contactAttributeKeys={contactAttributeKeys}
                        locale={locale}
                      />
                    </div>
                    {questionIdx !== 0 && (
                      <QuestionFormInput
                        id="backButtonLabel"
                        value={question.backButtonLabel}
                        label={t("environments.surveys.edit.back_button_label")}
                        localSurvey={localSurvey}
                        questionIdx={questionIdx}
                        maxLength={48}
                        placeholder={t("common.back")}
                        isInvalid={isInvalid}
                        updateQuestion={updateQuestion}
                        selectedLanguageCode={selectedLanguageCode}
                        setSelectedLanguageCode={setSelectedLanguageCode}
                        contactAttributeKeys={contactAttributeKeys}
                        locale={locale}
                        onBlur={(e) => {
                          if (!question.backButtonLabel) return;
                          let translatedBackButtonLabel = {
                            ...question.backButtonLabel,
                            [selectedLanguageCode]: e.target.value,
                          };
                          updateEmptyButtonLabels("backButtonLabel", translatedBackButtonLabel, 0);
                        }}
                      />
                    )}
                  </div>
                ) : null}
                {(question.type === TSurveyQuestionTypeEnum.Rating ||
                  question.type === TSurveyQuestionTypeEnum.NPS) &&
                  questionIdx !== 0 && (
                    <div className="mt-4">
                      <QuestionFormInput
                        id="backButtonLabel"
                        value={question.backButtonLabel}
                        label={`"Back" Button Label`}
                        localSurvey={localSurvey}
                        questionIdx={questionIdx}
                        maxLength={48}
                        placeholder={"Back"}
                        isInvalid={isInvalid}
                        updateQuestion={updateQuestion}
                        selectedLanguageCode={selectedLanguageCode}
                        setSelectedLanguageCode={setSelectedLanguageCode}
                        contactAttributeKeys={contactAttributeKeys}
                        locale={locale}
                      />
                    </div>
                  )}

                <AdvancedSettings
                  question={question}
                  questionIdx={questionIdx}
                  localSurvey={localSurvey}
                  updateQuestion={updateQuestion}
                  contactAttributeKeys={contactAttributeKeys}
                />
              </Collapsible.CollapsibleContent>
            </Collapsible.Root>
          </div>
        </Collapsible.CollapsibleContent>

        {open && (
          <div className="mx-4 flex justify-end space-x-6 border-t border-slate-200">
            {question.type === "openText" && (
              <div className="my-4 flex items-center justify-end space-x-2">
                <Label htmlFor="longAnswer">{t("environments.surveys.edit.long_answer")}</Label>
                <Switch
                  id="longAnswer"
                  disabled={question.inputType !== "text"}
                  checked={question.longAnswer !== false}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuestion(questionIdx, {
                      longAnswer: typeof question.longAnswer === "undefined" ? false : !question.longAnswer,
                    });
                  }}
                />
              </div>
            )}
            {
              <div className="my-4 flex items-center justify-end space-x-2">
                <Label htmlFor="required-toggle">{t("environments.surveys.edit.required")}</Label>
                <Switch
                  id="required-toggle"
                  checked={question.required}
                  disabled={getIsRequiredToggleDisabled()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequiredToggle();
                  }}
                />
              </div>
            }
          </div>
        )}
      </Collapsible.Root>
    </div>
  );
};
