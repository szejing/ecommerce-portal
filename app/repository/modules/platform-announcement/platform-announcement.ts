import HttpFactory from '~/repository/factory';
import MerchantRoutes from '~/repository/routes.client';
import type { LoginReq } from '../auth/models/request/login.req';
import type { LoginResp } from '../auth/models/response/login.resp';
import type { VerifyResp } from '../auth/models/response/verify.resp';

class PlatformAnnouncementModule extends HttpFactory {
	private readonly auth = MerchantRoutes.PlatformAuth;
	private readonly announcements = MerchantRoutes.PlatformAnnouncements;

	async login(data: LoginReq): Promise<LoginResp> {
		return await this.call<LoginResp>({
			method: 'POST',
			url: this.auth.Login(),
			body: data,
		});
	}

	async verify(): Promise<VerifyResp> {
		return await this.call<VerifyResp>({
			method: 'POST',
			url: this.auth.Verify(),
			body: {},
		});
	}

	async logout(): Promise<{ response_code: number }> {
		return await this.call<{ response_code: number }>({
			method: 'POST',
			url: this.auth.Logout(),
			body: {},
		});
	}

	async listInApp() {
		return await this.call<{ announcements: Record<string, unknown>[] }>({
			method: 'GET',
			url: this.announcements.InAppMany(),
		});
	}

	async createInApp(body: Record<string, unknown>) {
		return await this.call<{ announcement: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.InAppCreate(),
			body,
		});
	}

	async publishInApp(id: string) {
		return await this.call<{ announcement: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.InAppPublish(id),
			body: {},
		});
	}

	async unpublishInApp(id: string) {
		return await this.call<{ announcement: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.InAppUnpublish(id),
			body: {},
		});
	}

	async listEmailBlasts() {
		return await this.call<{ blasts: Record<string, unknown>[] }>({
			method: 'GET',
			url: this.announcements.EmailBlastsMany(),
		});
	}

	async createEmailBlast(body: Record<string, unknown>) {
		return await this.call<{ blast: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.EmailBlastCreate(),
			body,
		});
	}

	async cancelEmailBlast(id: string) {
		return await this.call<{ blast: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.EmailBlastCancel(id),
			body: {},
		});
	}

	async sendEmailBlast(id: string) {
		return await this.call<{ blast: Record<string, unknown> }>({
			method: 'POST',
			url: this.announcements.EmailBlastSend(id),
			body: {},
		});
	}
}

export default PlatformAnnouncementModule;
