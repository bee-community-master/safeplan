import 'server-only';
import { NextResponse } from 'next/server';

const USER_SAFE_ERRORS: Record<string, string> = {
  UNAUTHORIZED: '다시 접속해 본인 확인을 완료해 주세요.',
  FORBIDDEN: '이 자료에 접근할 권한을 확인할 수 없습니다.',
  NOT_FOUND: '요청한 자료를 찾을 수 없습니다.',
  case_not_found: '자료 묶음을 찾을 수 없습니다. 처음부터 다시 진행해 주세요.',
  report_not_found: '리포트를 찾을 수 없습니다. 리포트를 다시 생성해 주세요.',
  share_not_found: '공유 링크를 찾을 수 없습니다.',
  share_expired: '만료되었거나 폐기된 링크입니다.',
  share_password_required: '비밀번호를 입력해 주세요.',
  share_password_invalid: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.',
  payment_required: '결제 완료 후 자료 정리를 시작할 수 있습니다.',
  payment_consent_required: '결제 동의 기록을 먼저 완료해 주세요.',
  consent_required: '필수 동의를 완료한 뒤 자료 정리를 시작할 수 있습니다.',
  payment_not_found: '결제 정보를 찾을 수 없습니다. 결제를 다시 시도해 주세요.',
  mock_payment_only: '현재 결제를 완료할 수 없습니다. 다시 시도해 주세요.',
  toss_payment_required: '결제 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
  payment_amount_mismatch: '결제 금액이 일치하지 않습니다. 다시 시도해 주세요.',
  payment_order_mismatch: '결제 정보가 일치하지 않습니다. 다시 시도해 주세요.',
  toss_credentials_missing: '결제 준비가 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  production_payment_provider_required: '결제 준비가 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  toss_confirm_failed: '결제 승인을 완료하지 못했습니다. 결제 상태를 확인한 뒤 다시 시도해 주세요.',
  toss_retrieve_failed: '결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  toss_webhook_secret_missing: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  toss_webhook_signature_invalid: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  no_confirmed_cards: '리포트에 포함할 자료를 먼저 확인해 주세요.',
  share_not_owned: '이 공유 링크를 변경할 권한을 확인할 수 없습니다.',
  envelope_master_key_missing: '자료 보호 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.',
  envelope_master_key_invalid: '자료 보호 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.'
};

function userSafeErrorMessage(message: string): string {
  if (USER_SAFE_ERRORS[message]) return USER_SAFE_ERRORS[message];
  if (/missing|credential|secret|key|provider|mock|toss|prisma|gcs|kms|database|internal|failed|_/.test(message)) {
    return '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return message;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: userSafeErrorMessage(message) }, { status });
}
